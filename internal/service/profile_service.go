package service

import (
	"errors"

	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/FruitsAI/Orange/internal/repository"
)

// ProfileService 个人信息管理服务
// 负责处理当前用户的个人信息查询和更新、密码修改等操作。
//
// 依赖:
//   - UserRepository: 用户数据操作接口
type ProfileService struct {
	userRepo *repository.UserRepository
}

// NewProfileService 创建个人信息服务实例
//
// 返回:
//   - *ProfileService: 初始化的服务实例
func NewProfileService() *ProfileService {
	return &ProfileService{
		userRepo: repository.NewUserRepository(),
	}
}

// GetCurrentUser 获取当前登录用户详情
func (s *ProfileService) GetCurrentUser(userID int64) (*models.User, error) {
	return s.userRepo.FindByID(userID)
}

// UpdateProfile 更新个人资料
// 支持部分更新（Name, Email, Phone, Department, Position）。
//
// 参数:
//   - userID: 用户ID
//   - name, email...: 待更新字段，为空则不更新
//
// 返回:
//   - *models.User: 更新后的用户实体
//   - error: 数据库错误
func (s *ProfileService) UpdateProfile(userID int64, name, email, phone, department, position string) (*models.User, error) {
	updates := map[string]interface{}{}

	if name != "" {
		updates["name"] = name
	}
	if email != "" {
		if s.userRepo.ExistsByEmailExceptID(email, userID) {
			return nil, errors.New("邮箱已存在")
		}
		updates["email"] = email
	}
	if phone != "" {
		updates["phone"] = phone
	}
	if department != "" {
		updates["department"] = department
	}
	if position != "" {
		updates["position"] = position
	}

	if len(updates) > 0 {
		if err := s.userRepo.UpdateFields(userID, updates); err != nil {
			return nil, err
		}
	}

	return s.userRepo.FindByID(userID)
}

// ChangePassword 修改密码
// 验证旧密码正确性后，更新为新密码（加密存储）。
//
// 参数:
//   - userID: 用户ID
//   - oldPassword: 旧密码
//   - newPassword: 新密码
//
// 返回:
//   - error: 验证失败或更新错误
func (s *ProfileService) ChangePassword(userID int64, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(userID)
	if err := validatePasswordStrength(newPassword); err != nil {
		return err
	}

	if err != nil {
		return errors.New("用户不存在")
	}

	// 1. 验证旧密码
	if !password.CheckPassword(oldPassword, user.Password) {
		return errors.New("原密码错误")
	}

	// 2. 加密新密码
	hashedPassword, err := password.HashPassword(newPassword)
	if err != nil {
		return errors.New("密码加密失败")
	}

	// 3. 更新数据库
	return s.userRepo.UpdateFields(userID, map[string]interface{}{
		"password": hashedPassword,
	})
}
