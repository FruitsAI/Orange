package jwt

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func init() {
	// 设置测试密钥
	SecretKey = []byte("test-secret-key-for-unit-testing-only")
	TokenExpiry = 24 * time.Hour
}

func TestGenerateToken(t *testing.T) {
	t.Run("成功生成Token", func(t *testing.T) {
		token, err := GenerateToken(1, "admin", "admin")
		assert.NoError(t, err)
		assert.NotEmpty(t, token)
	})

	t.Run("Token不为空", func(t *testing.T) {
		token, err := GenerateToken(1, "testuser", "user")
		assert.NoError(t, err)
		assert.True(t, len(token) > 20, "Token 长度应该足够")
	})
}

func TestParseToken(t *testing.T) {
	t.Run("成功解析有效Token", func(t *testing.T) {
		token, _ := GenerateToken(1, "admin", "admin")
		claims, err := ParseToken(token)
		assert.NoError(t, err)
		assert.NotNil(t, claims)
		assert.Equal(t, int64(1), claims.UserID)
		assert.Equal(t, "admin", claims.Username)
		assert.Equal(t, "admin", claims.Role)
	})

	t.Run("拒绝无效Token", func(t *testing.T) {
		claims, err := ParseToken("invalid-token-string")
		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("拒绝空Token", func(t *testing.T) {
		claims, err := ParseToken("")
		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("拒绝错误签名密钥的Token", func(t *testing.T) {
		// 用不同的密钥签名
		originalKey := SecretKey
		SecretKey = []byte("wrong-key")
		token, _ := GenerateToken(1, "admin", "admin")

		// 恢复正确密钥
		SecretKey = originalKey
		claims, err := ParseToken(token)
		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("正确解析用户角色", func(t *testing.T) {
		tests := []struct {
			role     string
			userID   int64
			username string
		}{
			{"admin", 1, "admin_user"},
			{"user", 2, "normal_user"},
			{"manager", 3, "manager_user"},
		}

		for _, tt := range tests {
			token, _ := GenerateToken(tt.userID, tt.username, tt.role)
			claims, err := ParseToken(token)
			assert.NoError(t, err)
			assert.Equal(t, tt.userID, claims.UserID)
			assert.Equal(t, tt.username, claims.Username)
			assert.Equal(t, tt.role, claims.Role)
		}
	})
}

func TestTokenExpiry(t *testing.T) {
	t.Run("过期Token应该被拒绝", func(t *testing.T) {
		// 设置极短的过期时间
		originalExpiry := TokenExpiry
		TokenExpiry = 1 * time.Nanosecond
		token, _ := GenerateToken(1, "admin", "admin")

		// 等待 Token 过期
		time.Sleep(10 * time.Millisecond)

		// 恢复过期时间
		TokenExpiry = originalExpiry

		claims, err := ParseToken(token)
		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}
