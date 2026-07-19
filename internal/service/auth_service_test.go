package service

import (
	"sync"
	"testing"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var authTestDBOnce sync.Once

func setupAuthTestDB(t *testing.T) {
	t.Helper()

	authTestDBOnce.Do(func() {
		config.AppConfig = &config.Config{
			DBType: "sqlite",
			DBPath: "file:auth_test?mode=memory&cache=shared",
		}

		db := database.GetDB()
		require.NoError(t, db.AutoMigrate(&models.User{}))
	})
}

// TestAuthService_Login 测试登录功能
func TestAuthService_Login(t *testing.T) {
	setupAuthTestDB(t)
	authSvc := NewAuthService()
	userSvc := NewUserService()

	// 先创建测试用户 - 使用实际加密
	userSvc.userRepo.Create(&models.User{
		Username: "loginuser",
		Password: mustHashPassword("Test1234"),
		Email:    "login@example.com",
		Role:     constants.RoleUser,
		Status:   1,
	})

	t.Run("成功登录", func(t *testing.T) {
		result, err := authSvc.Login("loginuser", "Test1234")
		require.NoError(t, err)
		assert.NotEmpty(t, result.Token)
		assert.Equal(t, "loginuser", result.User.Username)
	})

	t.Run("用户名错误应返回401", func(t *testing.T) {
		_, err := authSvc.Login("wronguser", "Test1234")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "用户名或密码错误")
	})

	t.Run("密码错误应返回401", func(t *testing.T) {
		_, err := authSvc.Login("loginuser", "WrongPassword")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "用户名或密码错误")
	})
}

// mustHashPassword 测试辅助函数 - 密码加密
func mustHashPassword(pwd string) string {
	hash, err := password.HashPassword(pwd)
	if err != nil {
		panic(err)
	}
	return hash
}

// TestProfileService_ChangePassword 测试修改密码
func TestProfileService_ChangePassword(t *testing.T) {
	setupAuthTestDB(t)
	profileSvc := NewProfileService()
	userSvc := NewUserService()

	// 创建测试用户
	user := &models.User{
		Username: "changepassuser",
		Password: mustHashPassword("Test1234"),
		Email:    "changepass@example.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	userSvc.userRepo.Create(user)

	t.Run("成功修改密码", func(t *testing.T) {
		err := profileSvc.ChangePassword(user.ID, "Test1234", "NewPass123")
		require.NoError(t, err)

		// 验证新密码可以登录
		authSvc := NewAuthService()
		result, err := authSvc.Login("changepassuser", "NewPass123")
		require.NoError(t, err)
		assert.NotEmpty(t, result.Token)
	})

	t.Run("旧密码错误应返回400", func(t *testing.T) {
		// 重新创建用户，因为上一个测试已修改密码
		user2 := &models.User{
			Username: "changepassuser2",
			Password: mustHashPassword("Test1234"),
			Email:    "changepass2@example.com",
			Role:     constants.RoleUser,
			Status:   1,
		}
		userSvc.userRepo.Create(user2)

		err := profileSvc.ChangePassword(user2.ID, "WrongOldPassword", "NewPass456")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "原密码错误")
	})

	t.Run("新密码强度不足应返回400", func(t *testing.T) {
		// 重新创建用户
		user3 := &models.User{
			Username: "changepassuser3",
			Password: mustHashPassword("Test1234"),
			Email:    "changepass3@example.com",
			Role:     constants.RoleUser,
			Status:   1,
		}
		userSvc.userRepo.Create(user3)

		err := profileSvc.ChangePassword(user3.ID, "Test1234", "123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "密码长度至少8位")
	})
}
