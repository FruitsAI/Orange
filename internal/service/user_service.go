package service

import (
	"errors"

	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/cache"
	pkgerrors "github.com/FruitsAI/Orange/internal/pkg/errors"
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
	if role != constants.RoleAdmin && role != constants.RoleUser {
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
		return pkgerrors.ErrUsernameExists
	}
	if input.Email != "" && s.userRepo.ExistsByEmail(input.Email) {
		return pkgerrors.ErrEmailExists
	}

	if err := validatePasswordStrength(input.Password); err != nil {
		return pkgerrors.WrapWithCode(err, 400, err.Error())
	}

	hashedPassword, err := password.HashPassword(input.Password)
	if err != nil {
		return pkgerrors.Wrap(err, "密码加密失败")
	}

	role := input.Role
	if role == "" {
		role = constants.RoleUser
	}
	if err := validateUserRole(role); err != nil {
		return pkgerrors.WrapWithCode(err, 400, err.Error())
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

	if err := s.userRepo.Create(user); err != nil {
		return pkgerrors.Wrap(err, "创建用户失败")
	}
	return nil
}

// UpdateUser 更新用户 (管理员)
func (s *UserService) UpdateUser(id int64, input dto.UpdateUserRequest) error {
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Email != "" {
		if s.userRepo.ExistsByEmailExceptID(input.Email, id) {
			return pkgerrors.ErrEmailExists
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
			return pkgerrors.WrapWithCode(err, 400, err.Error())
		}
		updates["role"] = input.Role
	}
	if input.Status != nil {
		updates["status"] = *input.Status
	}

	if err := s.userRepo.UpdateFields(id, updates); err != nil {
		return pkgerrors.Wrap(err, "更新用户失败")
	}

	// 任何用户资料变更后都清除鉴权状态缓存（JWT 中间件缓存了状态+角色），
	// 使禁用/降级尽快生效（并发下最迟一个缓存 TTL）
	_ = cache.Delete(cache.UserActiveKey(id))
	return nil
}

// DeleteUser 删除用户 (管理员)
func (s *UserService) DeleteUser(id int64) error {
	if err := s.userRepo.Delete(id); err != nil {
		return err
	}
	// 删除后清除鉴权状态缓存，使该用户的存量 JWT 尽快失效
	_ = cache.Delete(cache.UserActiveKey(id))
	return nil
}

// ResetPassword 重置用户密码 (管理员)
func (s *UserService) ResetPassword(id int64, newPassword string) error {
	if err := validatePasswordStrength(newPassword); err != nil {
		return pkgerrors.WrapWithCode(err, 400, err.Error())
	}

	hashedPassword, err := password.HashPassword(newPassword)
	if err != nil {
		return pkgerrors.Wrap(err, "密码加密失败")
	}
	if err := s.userRepo.UpdateFields(id, map[string]interface{}{
		"password": hashedPassword,
	}); err != nil {
		return pkgerrors.Wrap(err, "重置密码失败")
	}
	return nil
}
