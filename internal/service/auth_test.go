package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidatePasswordStrength(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		// 有效密码
		{"强密码-大小写数字", "MyP@ssw0rd", false},
		{"有效-大小写字母", "Abcdefgh", false},
		{"有效-大写字母数字", "ABC12345", false},
		{"有效-小写字母数字", "abc12345", false},
		{"有效-8位最小长度", "Abcd1234", false},
		{"有效-包含特殊字符", "P@ssw0rd!", false},

		// 无效密码
		{"太短-7位", "Abc1234", true},
		{"太短-1位", "A", true},
		{"太短-空密码", "", true},
		{"无复杂度-纯小写", "abcdefgh", true},
		{"无复杂度-纯数字", "12345678", true},
		{"无复杂度-纯大写", "ABCDEFGH", true},
		{"无复杂度-纯特殊字符", "!@#$%^&*", true},
		{"7位混合", "Abc123!", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePasswordStrength(tt.password)
			if tt.wantErr {
				assert.Error(t, err, "密码 '%s' 应该验证失败", tt.password)
			} else {
				assert.NoError(t, err, "密码 '%s' 应该验证通过", tt.password)
			}
		})
	}
}
