package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWT 基础配置
var (
	// SecretKey JWT 签名密钥
	// 必须从配置文件或环境变量读取，禁止使用硬编码默认值。
	SecretKey []byte

	// TokenExpiry Token 有效期时长
	// 此变量通常由 main.go 在启动时根据配置注入初始化。
	TokenExpiry time.Duration
)

// Claims 自定义 JWT 载荷结构
// 包含业务需要的用户信息以及 JWT 标准声明 (RegisteredClaims)。
type Claims struct {
	UserID               int64  `json:"user_id"`  // 用户ID
	Username             string `json:"username"` // 用户名
	Role                 string `json:"role"`     // 用户角色
	jwt.RegisteredClaims        // 内嵌标准声明 (如过期时间、签发人等)
}

// GenerateToken 生成 JWT Token
// 参数:
//   - userID: 用户ID
//   - username: 用户名
//   - role: 用户角色
//
// 返回:
//   - string: 签名后的 Token 字符串
//   - error: 签名过程中可能出现的错误
func GenerateToken(userID int64, username, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenExpiry)), // 过期时间
			IssuedAt:  jwt.NewNumericDate(time.Now()),                  // 签发时间
			NotBefore: jwt.NewNumericDate(time.Now()),                  // 生效时间
			Issuer:    "orange",                                        // 签发人/应用名
		},
	}

	// 使用 HS256 签名算法创建 Token 对象
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// 使用密钥进行签名并生成字符串
	return token.SignedString(SecretKey)
}

// ParseToken 解析并验证 JWT Token
// 验证主要包括: 签名有效性、是否过期、格式是否正确。
func ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// 安全检查: 验证签名算法是否为预期的 HMAC (HS256)
		// 防止算法降级攻击 (如攻击者将 header 中的 alg 改为 None)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return SecretKey, nil
	})

	if err != nil {
		return nil, err
	}

	// 验证 Token 有效性并提取 Claims
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
