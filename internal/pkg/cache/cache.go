package cache

import (
	"log"
	"os"
	"time"
)

var globalCache Cache

// Init 初始化缓存
func Init() error {
	// 检查是否配置了Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr != "" {
		// 使用Redis缓存
		redisPassword := os.Getenv("REDIS_PASSWORD")
		redisCache := NewRedisCache(redisAddr, redisPassword, 0)

		// 测试连接
		if err := redisCache.Set("_health_check", []byte("ok"), 10*time.Second); err != nil {
			log.Printf("Redis连接失败，降级到内存缓存: %v", err)
			globalCache = NewMemoryCache()
		} else {
			_ = redisCache.Delete("_health_check")
			globalCache = redisCache
		}
	} else {
		// 使用内存缓存
		globalCache = NewMemoryCache()
	}
	return nil
}

// GetCache 获取全局缓存实例
func GetCache() Cache {
	if globalCache == nil {
		if err := Init(); err != nil {
			// 初始化失败时降级到内存缓存
			log.Printf("缓存初始化失败，使用内存缓存: %v", err)
			globalCache = NewMemoryCache()
		}
	}
	return globalCache
}

// Get 获取缓存（便捷方法）
func Get(key string) ([]byte, error) {
	return GetCache().Get(key)
}

// Set 设置缓存（便捷方法）
func Set(key string, value []byte, ttl time.Duration) error {
	return GetCache().Set(key, value, ttl)
}

// Delete 删除缓存（便捷方法）
func Delete(key string) error {
	return GetCache().Delete(key)
}
