package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache Redis缓存实现
type RedisCache struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisCache 创建Redis缓存实例
func NewRedisCache(addr, password string, db int) *RedisCache {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	return &RedisCache{
		client: client,
		ctx:    context.Background(),
	}
}

// Get 获取缓存
func (c *RedisCache) Get(key string) ([]byte, error) {
	val, err := c.client.Get(c.ctx, key).Bytes()
	if err == redis.Nil {
		return nil, ErrCacheMiss
	}
	if err != nil {
		return nil, err
	}
	return val, nil
}

// Set 设置缓存
func (c *RedisCache) Set(key string, value []byte, ttl time.Duration) error {
	return c.client.Set(c.ctx, key, value, ttl).Err()
}

// Delete 删除缓存
func (c *RedisCache) Delete(key string) error {
	return c.client.Del(c.ctx, key).Err()
}

// Clear 清空所有缓存（谨慎使用）
func (c *RedisCache) Clear() error {
	return c.client.FlushDB(c.ctx).Err()
}

// GetJSON 获取并反序列化JSON
func (c *RedisCache) GetJSON(key string, v interface{}) error {
	data, err := c.Get(key)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// SetJSON 序列化并设置JSON
func (c *RedisCache) SetJSON(key string, v interface{}, ttl time.Duration) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return c.Set(key, data, ttl)
}

// Ping 检查Redis连接
func (c *RedisCache) Ping() error {
	return c.client.Ping(c.ctx).Err()
}

// Close 关闭Redis连接
func (c *RedisCache) Close() error {
	return c.client.Close()
}
