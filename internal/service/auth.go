package service

import (
	"errors"
	"log/slog"
	"regexp"
	"time"

	"github.com/FruitsAI/Orange/internal/dto"
	pkgerrors "github.com/FruitsAI/Orange/internal/pkg/errors"
	"github.com/FruitsAI/Orange/internal/pkg/jwt"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/FruitsAI/Orange/internal/repository"
	"gorm.io/gorm"
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

// dummyBcryptHash 任意密码的 bcrypt 哈希（内容无意义）
// 用户名不存在时也执行一次同代价的哈希比对，抹平响应时间差，
// 防止通过登录耗时探测用户名是否存在。
const dummyBcryptHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

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
		if err == gorm.ErrRecordNotFound {
			password.CheckPassword(pwd, dummyBcryptHash)
			return nil, pkgerrors.WrapWithCode(err, 401, "用户名或密码错误")
		}
		return nil, pkgerrors.Wrap(err, "查询用户失败")
	}

	// 2. 验证密码 (比对哈希)
	if !password.CheckPassword(pwd, user.Password) {
		return nil, pkgerrors.New(401, "用户名或密码错误")
	}

	// 3. 检查账户状态
	if user.Status != 1 {
		return nil, pkgerrors.New(403, "账户已被禁用")
	}

	// 4. 生成 JWT Token
	// Payload 包含: ID, Username, Role
	token, err := jwt.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return nil, pkgerrors.Wrap(err, "生成Token失败")
	}

	// 5. 更新最后登录时间
	now := time.Now()
	if err := s.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"last_login_time": now,
	}); err != nil {
		// 提升日志级别为 Error，便于监控告警
		slog.Error("Failed to update last login time", "user_id", user.ID, "error", err)
		// 考虑是否返回错误（如果审计日志至关重要，应阻止登录）
		// 当前策略：记录错误但不阻断登录流程
	}

	return &dto.LoginResult{Token: token, User: user}, nil
}
