package service

import (
	"errors"

	"github.com/FruitsAI/Orange/internal/models"
	pkgerrors "github.com/FruitsAI/Orange/internal/pkg/errors"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/FruitsAI/Orange/internal/repository"
	"gorm.io/gorm"
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
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, pkgerrors.ErrUserNotFound
		}
		return nil, pkgerrors.Wrap(err, "查询用户失败")
	}
	return user, nil
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
			return nil, pkgerrors.ErrEmailExists
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
			return nil, pkgerrors.Wrap(err, "更新个人资料失败")
		}
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, pkgerrors.Wrap(err, "查询用户失败")
	}
	return user, nil
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
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return pkgerrors.ErrUserNotFound
		}
		return pkgerrors.Wrap(err, "查询用户失败")
	}

	// 1. 验证旧密码
	if !password.CheckPassword(oldPassword, user.Password) {
		return pkgerrors.WrapWithCode(errors.New("原密码错误"), 400, "原密码错误")
	}

	// 2. 验证新密码强度
	if err := validatePasswordStrength(newPassword); err != nil {
		return pkgerrors.WrapWithCode(err, 400, err.Error())
	}

	// 3. 加密新密码
	hashedPassword, err := password.HashPassword(newPassword)
	if err != nil {
		return pkgerrors.Wrap(err, "密码加密失败")
	}

	// 4. 更新数据库
	if err := s.userRepo.UpdateFields(userID, map[string]interface{}{
		"password": hashedPassword,
	}); err != nil {
		return pkgerrors.Wrap(err, "更新密码失败")
	}
	return nil
}
