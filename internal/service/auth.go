package service

import (
	"errors"
	"time"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/jwt"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/FruitsAI/Orange/internal/repository"
)

// AuthService 认证服务
// 负责处理用户登录、注册、密码管理及当前用户信息获取等安全相关业务。
//
// 依赖:
//   - UserRepository: 用户数据操作接口
type AuthService struct {
	userRepo *repository.UserRepository
}

// NewAuthService 创建认证服务实例
//
// 返回:
//   - *AuthService: 初始化的服务实例
func NewAuthService() *AuthService {
	return &AuthService{
		userRepo: repository.NewUserRepository(),
	}
}

// Login 用户登录
// 验证用户名和密码，成功后颁发 JWT Token 并更新最后登录时间。
//
// 参数:
//   - username: 用户名
//   - pwd: 密码 (明文)
//
// 返回:
//   - *dto.LoginResult: 包含 Token 和用户信息的结构体
//   - error: 认证失败（用户名/密码错误或账户被禁用）
func (s *AuthService) Login(username, pwd string) (*dto.LoginResult, error) {
	// 1. 查找用户
	user, err := s.userRepo.FindByCredential(username)
	if err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	// 2. 验证密码 (比对哈希)
	if !password.CheckPassword(pwd, user.Password) {
		return nil, errors.New("用户名或密码错误")
	}

	// 3. 检查账户状态
	if user.Status != 1 {
		return nil, errors.New("账户已被禁用")
	}

	// 4. 生成 JWT Token
	// Payload 包含: ID, Username, Role
	token, err := jwt.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return nil, errors.New("生成Token失败")
	}

	// 5. 异步更新最后登录时间 (非关键路径，暂同步执行，可优化)
	now := time.Now()
	s.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"last_login_time": now,
	})

	return &dto.LoginResult{Token: token, User: user}, nil
}

// Register 用户注册
// 创建新用户账号，检查用户名和邮箱唯一性，并对密码进行加密存储。
//
// 参数:
//   - input: 注册请求DTO
//
// 返回:
//   - error: 注册失败（如信息已存在或加密失败）
func (s *AuthService) Register(input dto.RegisterRequest) error {
	// 1. 唯一性检查
	if s.userRepo.ExistsByUsername(input.Username) {
		return errors.New("用户名已被注册")
	}
	if input.Email != "" && s.userRepo.ExistsByEmail(input.Email) {
		return errors.New("邮箱已被注册")
	}

	// 2. 密码加密 (Bcrypt)
	hashedPassword, err := password.HashPassword(input.Password)
	if err != nil {
		return errors.New("密码加密失败")
	}

	// 3. 构建用户实体
	user := &models.User{
		Username: input.Username,
		Name:     input.Name,
		Email:    input.Email,
		Phone:    input.Phone,
		Password: hashedPassword,
		Role:     "user", // 默认为普通用户
		Status:   1,      // 默认启用
	}

	// 4. 保存至数据库
	return s.userRepo.Create(user)
}

// GetCurrentUser 获取当前登录用户详情
func (s *AuthService) GetCurrentUser(userID int64) (*models.User, error) {
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
func (s *AuthService) UpdateProfile(userID int64, name, email, phone, department, position string) (*models.User, error) {
	updates := map[string]interface{}{}

	if name != "" {
		updates["name"] = name
	}
	if email != "" {
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
func (s *AuthService) ChangePassword(userID int64, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(userID)
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

// ListUsers 获取用户列表 (管理员)
func (s *AuthService) ListUsers(page, pageSize int, keyword string) (*dto.UserPageResult, error) {
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
func (s *AuthService) CreateUser(input dto.CreateUserRequest) error {
	if s.userRepo.ExistsByUsername(input.Username) {
		return errors.New("用户名已被注册")
	}
	if input.Email != "" && s.userRepo.ExistsByEmail(input.Email) {
		return errors.New("邮箱已被注册")
	}

	hashedPassword, err := password.HashPassword(input.Password)
	if err != nil {
		return errors.New("密码加密失败")
	}

	role := input.Role
	if role != "admin" {
		role = "user"
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
func (s *AuthService) UpdateUser(id int64, input dto.UpdateUserRequest) error {
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Email != "" {
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
		updates["role"] = input.Role
	}
	// Status always check (0 or 1)
	// But simple check: if status is provided?
	// For simplify, let's allow status update if it is in payload.
	// DTO status is int.
	updates["status"] = input.Status

	return s.userRepo.UpdateFields(id, updates)
}

// DeleteUser 删除用户 (管理员)
func (s *AuthService) DeleteUser(id int64) error {
	// Optional: Check if admin is deleting themselves?
	// Handler layer might handle "cannot delete self" logic or here.
	return s.userRepo.Delete(id)
}

// ResetPassword 重置用户密码 (管理员)
func (s *AuthService) ResetPassword(id int64, newPassword string) error {
	hashedPassword, err := password.HashPassword(newPassword)
	if err != nil {
		return errors.New("密码加密失败")
	}
	return s.userRepo.UpdateFields(id, map[string]interface{}{
		"password": hashedPassword,
	})
}
