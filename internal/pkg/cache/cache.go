package cache

import (
	"os"
	"time"
)

var globalCache Cache

// Init 初始化缓存
func Init() {
	// 检查是否配置了Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr != "" {
		// 使用Redis缓存
		redisPassword := os.Getenv("REDIS_PASSWORD")
		globalCache = NewRedisCache(redisAddr, redisPassword, 0)
	} else {
		// 使用内存缓存
		globalCache = NewMemoryCache()
	}
}

// GetCache 获取全局缓存实例
func GetCache() Cache {
	if globalCache == nil {
		Init()
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

// Clear 清空缓存（便捷方法）
func Clear() error {
	return GetCache().Clear()
}
