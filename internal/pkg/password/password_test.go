package password

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHashPassword(t *testing.T) {
	t.Run("成功加密密码", func(t *testing.T) {
		hash, err := HashPassword("MyP@ssw0rd")
		assert.NoError(t, err)
		assert.NotEmpty(t, hash)
		// bcrypt 哈希应该以 $2a$ 或 $2b$ 开头
		assert.True(t, len(hash) > 10, "hash should be long enough")
	})

	t.Run("不同密码生成不同哈希", func(t *testing.T) {
		hash1, _ := HashPassword("password1")
		hash2, _ := HashPassword("password2")
		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("相同密码生成不同哈希(salt不同)", func(t *testing.T) {
		hash1, _ := HashPassword("samepassword")
		hash2, _ := HashPassword("samepassword")
		assert.NotEqual(t, hash1, hash2) // bcrypt 每次 salt 不同
	})
}

func TestCheckPassword(t *testing.T) {
	t.Run("正确密码验证通过", func(t *testing.T) {
		password := "MyP@ssw0rd"
		hash, _ := HashPassword(password)
		assert.True(t, CheckPassword(password, hash))
	})

	t.Run("错误密码验证失败", func(t *testing.T) {
		hash, _ := HashPassword("correctpassword")
		assert.False(t, CheckPassword("wrongpassword", hash))
	})

	t.Run("空密码验证", func(t *testing.T) {
		hash, _ := HashPassword("")
		assert.True(t, CheckPassword("", hash))
		assert.False(t, CheckPassword("notempty", hash))
	})

	t.Run("无效哈希格式", func(t *testing.T) {
		assert.False(t, CheckPassword("password", "invalid-hash"))
	})
}
