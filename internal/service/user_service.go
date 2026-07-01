package service

import (
	"errors"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/FruitsAI/Orange/internal/repository"
)

// UserService 用户管理服务
// 负责处理用户的增删改查等管理操作（管理员功能）。
//
// 依赖:
//   - UserRepository: 用户数据操作接口
type UserService struct {
	userRepo *repository.UserRepository
}

// NewUserService 创建用户管理服务实例
//
// 返回:
//   - *UserService: 初始化的服务实例
func NewUserService() *UserService {
	return &UserService{
		userRepo: repository.NewUserRepository(),
	}
}

func validateUserRole(role string) error {
	if role != "admin" && role != "user" {
		return errors.New("无效的用户角色")
	}
	return nil
}

// ListUsers 获取用户列表 (管理员)
func (s *UserService) ListUsers(page, pageSize int, keyword string) (*dto.UserPageResult, error) {
	users, total, err := s.userRepo.List(page, pageSize, keyword)
	if err != nil {
		return nil, err
	}
	return &dto.UserPageResult{
		List:  users,
		Total: total,
	}, nil
}

// CreateUser 创建用户 (管理员)
func (s *UserService) CreateUser(input dto.CreateUserRequest) error {
	if s.userRepo.ExistsByUsername(input.Username) {
		return errors.New("用户名已存在")
	}
	if input.Email != "" && s.userRepo.ExistsByEmail(input.Email) {
		return errors.New("邮箱已存在")
	}

	if err := validatePasswordStrength(input.Password); err != nil {
		return err
	}

	hashedPassword, err := password.HashPassword(input.Password)
	if err != nil {
		return errors.New("密码加密失败")
	}

	role := input.Role
	if role == "" {
		role = "user"
	}
	if err := validateUserRole(role); err != nil {
		return err
	}

	user := &models.User{
		Username: input.Username,
		Name:     input.Name,
		Email:    input.Email,
		Phone:    input.Phone,
		Password: hashedPassword,
		Role:     role,
		Status:   1,
	}

	return s.userRepo.Create(user)
}

// UpdateUser 更新用户 (管理员)
func (s *UserService) UpdateUser(id int64, input dto.UpdateUserRequest) error {
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Email != "" {
		if s.userRepo.ExistsByEmailExceptID(input.Email, id) {
			return errors.New("邮箱已存在")
		}
		updates["email"] = input.Email
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.Department != "" {
		updates["department"] = input.Department
	}
	if input.Position != "" {
		updates["position"] = input.Position
	}
	if input.Role != "" {
		if err := validateUserRole(input.Role); err != nil {
			return err
		}
		updates["role"] = input.Role
	}
	if input.Status != nil {
		updates["status"] = *input.Status
	}

	return s.userRepo.UpdateFields(id, updates)
}

// DeleteUser 删除用户 (管理员)
func (s *UserService) DeleteUser(id int64) error {
	// Optional: Check if admin is deleting themselves?
	// Handler layer might handle "cannot delete self" logic or here.
	return s.userRepo.Delete(id)
}

// ResetPassword 重置用户密码 (管理员)
func (s *UserService) ResetPassword(id int64, newPassword string) error {
	if err := validatePasswordStrength(newPassword); err != nil {
		return err
	}

	hashedPassword, err := password.HashPassword(newPassword)
	if err != nil {
		return errors.New("密码加密失败")
	}
	return s.userRepo.UpdateFields(id, map[string]interface{}{
		"password": hashedPassword,
	})
}
