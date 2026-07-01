package service

import (
	"errors"
	"log/slog"
	"regexp"
	"time"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/pkg/jwt"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/FruitsAI/Orange/internal/repository"
)

// validatePasswordStrength 验证密码强度
func validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return errors.New("密码长度至少8位")
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	strength := 0
	if hasUpper {
		strength++
	}
	if hasLower {
		strength++
	}
	if hasDigit {
		strength++
	}

	if strength < 2 {
		return errors.New("密码必须包含大小写字母和数字中的至少两种")
	}

	return nil
}

// AuthService 认证服务
// 负责处理用户登录、登出等认证相关业务。
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
	if err := s.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"last_login_time": now,
	}); err != nil {
		slog.Warn("Failed to update last login time", "user_id", user.ID, "error", err)
	}

	return &dto.LoginResult{Token: token, User: user}, nil
}

// Logout 用户登出
// 如果需要维护 Token 黑名单或会话管理，可在此实现。
// 当前实现为无状态 JWT，登出由前端清除 Token 完成。
func (s *AuthService) Logout() error {
	// 无状态 JWT 场景下，服务端无需额外操作
	// 如需维护黑名单或撤销机制，可在此添加逻辑
	return nil
}

// ResetPassword 重置密码（通过邮箱验证码等方式）
// 注意：此方法为管理员重置他人密码，实际业务场景可能需要邮箱验证
func (s *AuthService) ResetPassword(userID int64, newPassword string) error {
	if err := validatePasswordStrength(newPassword); err != nil {
		return err
	}
	hashedPassword, err := password.HashPassword(newPassword)
	if err != nil {
		return errors.New("密码加密失败")
	}
	return s.userRepo.UpdateFields(userID, map[string]interface{}{
		"password": hashedPassword,
	})
}
