package middleware

import (
	"sync"
	"time"

	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/gin-gonic/gin"
)

// RateLimiter 速率限制器
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*Visitor
	limit    int           // 最大请求次数
	window   time.Duration // 时间窗口
	stopChan chan struct{} // 停止信号
}

// Visitor 访问者信息
type Visitor struct {
	count        int
	lastReset    time.Time
	blockedUntil time.Time
}

// NewRateLimiter 创建速率限制器
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*Visitor),
		limit:    limit,
		window:   window,
		stopChan: make(chan struct{}),
	}

	// 定期清理过期的访问者记录
	go rl.cleanupExpired()

	return rl
}

// Stop 停止速率限制器的后台清理 goroutine
func (rl *RateLimiter) Stop() {
	close(rl.stopChan)
}

// loginLimiter 全局单例登录限流器，登录与注册共用同一配额。
// 参数取自 constants，避免魔法数字散落。
var loginLimiter = NewRateLimiter(constants.LoginRateLimit, time.Duration(constants.LoginRateWindow)*time.Second)

// LoginRateLimiter limits login attempts by client IP.
func LoginRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !loginLimiter.Allow(ip) {
			response.TooManyRequests(c, "登录尝试过于频繁，请稍后再试")
			return
		}

		c.Next()
	}
}

// Allow 检查是否允许访问
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	visitor, exists := rl.visitors[ip]

	// 如果访问者不存在，创建新记录
	if !exists {
		rl.visitors[ip] = &Visitor{
			count:     1,
			lastReset: now,
		}
		return true
	}

	// 检查是否在封禁期内
	if now.Before(visitor.blockedUntil) {
		return false
	}

	// 检查时间窗口是否已过
	if now.Sub(visitor.lastReset) > rl.window {
		visitor.count = 1
		visitor.lastReset = now
		visitor.blockedUntil = time.Time{}
		return true
	}

	// 增加计数
	visitor.count++

	// 检查是否超过限制
	if visitor.count > rl.limit {
		// 触发封禁，时长取自 constants
		visitor.blockedUntil = now.Add(time.Duration(constants.LoginBlockDuration) * time.Second)
		return false
	}

	return true
}

// cleanupExpired 定期清理过期的访问者记录
func (rl *RateLimiter) cleanupExpired() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.mu.Lock()
			now := time.Now()
			for ip, visitor := range rl.visitors {
				// 清理超过 1 小时未访问的记录
				if now.Sub(visitor.lastReset) > time.Hour && now.After(visitor.blockedUntil) {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		case <-rl.stopChan:
			return
		}
	}
}
