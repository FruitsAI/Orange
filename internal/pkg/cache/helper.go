package cache

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// UserActiveKey 用户鉴权状态的缓存键
// JWT 中间件用它缓存"用户是否启用及当前角色"（值格式 "0" 或 "1:<role>"）；
// 管理端修改用户（状态/角色）或删除用户后应 Delete 该键，使变更尽快生效。
func UserActiveKey(userID int64) string {
	return fmt.Sprintf("user:active:v1:%d", userID)
}

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
