package cache

import (
	"encoding/json"
	"sync"
	"time"
)

// Cache 内存缓存接口
type Cache interface {
	Get(key string) ([]byte, error)
	Set(key string, value []byte, ttl time.Duration) error
	Delete(key string) error
	Clear() error
}

// MemoryCache 内存缓存实现
// 适用于单机部署，生产环境建议使用Redis
type MemoryCache struct {
	data     map[string]*cacheItem
	mu       sync.RWMutex
	stopChan chan struct{} // 用于停止清理 goroutine
}

type cacheItem struct {
	value      []byte
	expiration time.Time
}

// NewMemoryCache 创建内存缓存实例
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		data:     make(map[string]*cacheItem),
		stopChan: make(chan struct{}),
	}

	// 启动清理过期数据的goroutine
	go cache.cleanupExpired()

	return cache
}

// Get 获取缓存
func (c *MemoryCache) Get(key string) ([]byte, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.data[key]
	if !exists {
		return nil, ErrCacheMiss
	}

	// 检查是否过期
	if time.Now().After(item.expiration) {
		return nil, ErrCacheMiss
	}

	return item.value, nil
}

// Set 设置缓存
func (c *MemoryCache) Set(key string, value []byte, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data[key] = &cacheItem{
		value:      value,
		expiration: time.Now().Add(ttl),
	}

	return nil
}

// Delete 删除缓存
func (c *MemoryCache) Delete(key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.data, key)
	return nil
}

// Clear 清空所有缓存
func (c *MemoryCache) Clear() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data = make(map[string]*cacheItem)
	return nil
}

// cleanupExpired 定期清理过期缓存
func (c *MemoryCache) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.mu.Lock()
			now := time.Now()
			for key, item := range c.data {
				if now.After(item.expiration) {
					delete(c.data, key)
				}
			}
			c.mu.Unlock()
		case <-c.stopChan:
			return
		}
	}
}

// Stop 停止清理 goroutine
func (c *MemoryCache) Stop() {
	close(c.stopChan)
}

// GetJSON 获取并反序列化JSON
func (c *MemoryCache) GetJSON(key string, v interface{}) error {
	data, err := c.Get(key)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, v)
}

// SetJSON 序列化并设置JSON
func (c *MemoryCache) SetJSON(key string, v interface{}, ttl time.Duration) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}

	return c.Set(key, data, ttl)
}

// Stats 缓存统计信息
func (c *MemoryCache) Stats() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	total := len(c.data)
	expired := 0
	now := time.Now()

	for _, item := range c.data {
		if now.After(item.expiration) {
			expired++
		}
	}

	return map[string]interface{}{
		"total":   total,
		"active":  total - expired,
		"expired": expired,
	}
}

// ErrCacheMiss 缓存未命中
var ErrCacheMiss = &CacheError{Message: "cache miss"}

// CacheError 缓存错误
type CacheError struct {
	Message string
}

func (e *CacheError) Error() string {
	return e.Message
}
