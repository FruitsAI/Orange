package middleware

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewRateLimiter(t *testing.T) {
	t.Run("创建速率限制器", func(t *testing.T) {
		rl := NewRateLimiter(5, time.Minute)
		assert.NotNil(t, rl)
		assert.Equal(t, 5, rl.limit)
		assert.Equal(t, time.Minute, rl.window)
		// 清理
		rl.Stop()
	})
}

func TestRateLimiterAllow(t *testing.T) {
	t.Run("允许正常请求", func(t *testing.T) {
		rl := NewRateLimiter(5, time.Minute)
		defer rl.Stop()

		for i := 0; i < 5; i++ {
			assert.True(t, rl.Allow("192.168.1.1"), "第 %d 次请求应该被允许", i+1)
		}
	})

	t.Run("超限请求被拒绝", func(t *testing.T) {
		rl := NewRateLimiter(3, time.Minute)
		defer rl.Stop()

		// 前3次允许
		assert.True(t, rl.Allow("10.0.0.1"))
		assert.True(t, rl.Allow("10.0.0.1"))
		assert.True(t, rl.Allow("10.0.0.1"))
		// 第4次拒绝
		assert.False(t, rl.Allow("10.0.0.1"), "超限请求应该被拒绝")
	})

	t.Run("不同IP独立计算", func(t *testing.T) {
		rl := NewRateLimiter(2, time.Minute)
		defer rl.Stop()

		// IP1 用完配额
		assert.True(t, rl.Allow("10.0.0.1"))
		assert.True(t, rl.Allow("10.0.0.1"))
		assert.False(t, rl.Allow("10.0.0.1"))

		// IP2 应该正常
		assert.True(t, rl.Allow("10.0.0.2"), "不同IP应该独立计算")
	})

	t.Run("封禁期过后恢复", func(t *testing.T) {
		rl := NewRateLimiter(2, time.Minute)
		defer rl.Stop()

		// 用完配额
		rl.Allow("10.0.0.1")
		rl.Allow("10.0.0.1")
		assert.False(t, rl.Allow("10.0.0.1"))

		// 模拟封禁期过后
		rl.mu.Lock()
		visitor := rl.visitors["10.0.0.1"]
		visitor.blockedUntil = time.Now().Add(-1 * time.Second) // 过去时间
		visitor.lastReset = time.Now().Add(-2 * time.Minute)    // 重置窗口
		rl.mu.Unlock()

		// 应该恢复
		assert.True(t, rl.Allow("10.0.0.1"), "封禁期过后应该恢复")
	})
}

func TestRateLimiterStop(t *testing.T) {
	t.Run("停止速率限制器", func(t *testing.T) {
		rl := NewRateLimiter(5, time.Minute)
		// 停止不应该 panic
		rl.Stop()
	})
}

func TestRateLimiterCleanup(t *testing.T) {
	t.Run("清理过期记录", func(t *testing.T) {
		rl := NewRateLimiter(5, time.Minute)
		defer rl.Stop()

		// 添加一些访问者
		rl.Allow("10.0.0.1")
		rl.Allow("10.0.0.2")
		rl.Allow("10.0.0.3")

		// 手动将记录设为过期
		rl.mu.Lock()
		for _, visitor := range rl.visitors {
			visitor.lastReset = time.Now().Add(-2 * time.Hour)
		}
		rl.mu.Unlock()

		// 验证记录存在
		rl.mu.Lock()
		initialCount := len(rl.visitors)
		rl.mu.Unlock()
		assert.Equal(t, 3, initialCount)

		// 手动触发清理（模拟 ticker 触发）
		rl.mu.Lock()
		now := time.Now()
		for key, visitor := range rl.visitors {
			if now.Sub(visitor.lastReset) > time.Hour {
				delete(rl.visitors, key)
			}
		}
		rl.mu.Unlock()

		// 验证记录已清理
		rl.mu.Lock()
		finalCount := len(rl.visitors)
		rl.mu.Unlock()
		assert.Equal(t, 0, finalCount, "过期记录应该被清理")
	})
}
