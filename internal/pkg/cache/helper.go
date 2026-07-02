package cache

import (
	"encoding/json"
	"log"
	"time"
)

// GetJSON 获取并反序列化JSON（通用函数）
func GetJSON(key string, v interface{}) error {
	data, err := Get(key)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(data, v); err != nil {
		// 自动删除损坏的缓存
		_ = Delete(key)
		return err
	}

	return nil
}

// SetJSON 序列化并设置JSON（通用函数）
func SetJSON(key string, v interface{}, ttl time.Duration) error {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("Failed to marshal %T for cache: %v", v, err)
		return err
	}

	return Set(key, data, ttl)
}
