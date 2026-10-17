package service

import (
	"sync"
	"testing"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var userTestDBOnce sync.Once

func setupUserTestDB(t *testing.T) {
	t.Helper()

	userTestDBOnce.Do(func() {
		config.AppConfig = &config.Config{
			DBType: "sqlite",
			DBPath: "file:user_test?mode=memory&cache=shared",
		}

		db := database.GetDB()
		require.NoError(t, db.AutoMigrate(&models.User{}))
	})
}

// TestUserService_CreateUser 测试用户创建
func TestUserService_CreateUser(t *testing.T) {
	setupUserTestDB(t)
	svc := NewUserService()

	t.Run("成功创建用户", func(t *testing.T) {
		req := dto.CreateUserRequest{
			Username: "testuser1",
			Password: "Test1234",
			Name:     "测试用户1",
			Email:    "test1@example.com",
			Role:     constants.RoleUser,
		}

		err := svc.CreateUser(req)
		require.NoError(t, err)

		// 验证用户是否创建成功
		userRepo := NewUserService().userRepo
		user, err := userRepo.FindByCredential("testuser1")
		require.NoError(t, err)
		assert.Equal(t, "testuser1", user.Username)
		assert.Equal(t, "test1@example.com", user.Email)
	})

	t.Run("用户名重复应报错", func(t *testing.T) {
		req := dto.CreateUserRequest{
			Username: "testuser1", // 与上一个测试重复
			Password: "Test1234",
			Name:     "测试用户2",
			Email:    "test2@example.com",
			Role:     constants.RoleUser,
		}

		err := svc.CreateUser(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "用户名已存在")
	})

	t.Run("邮箱重复应报错", func(t *testing.T) {
		req := dto.CreateUserRequest{
			Username: "testuser2",
			Password: "Test1234",
			Name:     "测试用户3",
			Email:    "test1@example.com", // 与第一个测试重复
			Role:     constants.RoleUser,
		}

		err := svc.CreateUser(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "邮箱已")
	})

	t.Run("密码强度不足应报错", func(t *testing.T) {
		req := dto.CreateUserRequest{
			Username: "testuser3",
			Password: "123",
			Name:     "测试用户4",
			Email:    "test4@example.com",
			Role:     constants.RoleUser,
		}

		err := svc.CreateUser(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "密码长度至少8位")
	})

	t.Run("无效角色应报错", func(t *testing.T) {
		req := dto.CreateUserRequest{
			Username: "testuser4",
			Password: "Test1234",
			Name:     "测试用户5",
			Email:    "test5@example.com",
			Role:     "invalid_role",
		}

		err := svc.CreateUser(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "无效的用户角色")
	})
}

// TestUserService_UpdateUser 测试用户更新
func TestUserService_UpdateUser(t *testing.T) {
	setupUserTestDB(t)
	svc := NewUserService()

	// 创建测试用户
	req := dto.CreateUserRequest{
		Username: "updatetest",
		Password: "Test1234",
		Name:     "原名称",
		Email:    "update@example.com",
		Role:     constants.RoleUser,
	}
	err := svc.CreateUser(req)
	require.NoError(t, err)

	userRepo := NewUserService().userRepo
	user, _ := userRepo.FindByCredential("updatetest")

	t.Run("成功更新用户信息", func(t *testing.T) {
		updateReq := dto.UpdateUserRequest{
			Name:  "新名称",
			Phone: "13800138000",
		}

		err := svc.UpdateUser(user.ID, updateReq)
		require.NoError(t, err)

		// 验证更新
		updated, _ := userRepo.FindByID(user.ID)
		assert.Equal(t, "新名称", updated.Name)
		assert.Equal(t, "13800138000", updated.Phone)
	})

	t.Run("更新邮箱重复应报错", func(t *testing.T) {
		// 先创建另一个用户
		anotherReq := dto.CreateUserRequest{
			Username: "another",
			Password: "Test1234",
			Email:    "another@example.com",
		}
		svc.CreateUser(anotherReq)

		// 尝试将第一个用户的邮箱改为与第二个用户重复
		updateReq := dto.UpdateUserRequest{
			Email: "another@example.com",
		}

		err := svc.UpdateUser(user.ID, updateReq)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "邮箱已")
	})
}

// TestUserService_ResetPassword 测试密码重置
func TestUserService_ResetPassword(t *testing.T) {
	setupUserTestDB(t)
	svc := NewUserService()

	// 创建测试用户
	req := dto.CreateUserRequest{
		Username: "resettest",
		Password: "Test1234",
		Email:    "reset@example.com",
	}
	err := svc.CreateUser(req)
	require.NoError(t, err)

	userRepo := NewUserService().userRepo
	user, _ := userRepo.FindByCredential("resettest")

	t.Run("成功重置密码", func(t *testing.T) {
		newPassword := "NewPass123"
		err := svc.ResetPassword(user.ID, newPassword)
		require.NoError(t, err)

		// 验证密码已更改
		authSvc := NewAuthService()
		_, err = authSvc.Login("resettest", newPassword)
		assert.NoError(t, err)
	})

	t.Run("密码强度不足应报错", func(t *testing.T) {
		err := svc.ResetPassword(user.ID, "123")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "密码长度至少8位")
	})
}
