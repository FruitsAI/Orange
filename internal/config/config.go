package config

import (
	"crypto/rand"
	"encoding/base64"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config 应用全局配置结构体
// 包含数据库、安全、日志及第三方服务的所有配置项。
type Config struct {
	// 数据库配置
	DBType       string // 数据库类型: sqlite (默认), mysql, postgres
	DBPath       string // SQLite 文件路径 (仅 sqlite 有效)
	DBHost       string // 数据库主机 (mysql/postgres)
	DBPort       int    // 数据库端口
	DBUser       string // 数据库用户名
	DBPassword   string // 数据库密码
	DBName       string // 数据库名
	DBSSLMode    string // SSL 模式: disable (本地), require (云数据库)
	DBAutoCreate bool   // 是否自动创建数据库 (本地 true, 云托管 false)

	// API 服务配置
	APIServerPort   int  // 对外 API 服务端口 (默认 3456)
	EnableAPIServer bool // 是否启用对外 API 服务

	JWTSecret      string   // JWT 签名密钥
	AllowedOrigins []string // CORS 允许的域名白名单
	TokenExpiry    int64    // Token 有效期 (单位: 小时)
	LogEnable      bool     // 是否启用请求日志
	LogLevel       string   // 日志级别: debug, info, warn, error
	GitHubRepo     string   // 用于检查更新的 GitHub 仓库地址 (格式: owner/repo)
	LogPath        string   // 日志文件输出路径
	LogMaxSize     int      // 单个日志文件最大大小 (MB)
	LogMaxBackups  int      // 保留旧日志文件的最大个数
	LogMaxAge      int      // 保留旧日志文件的最大天数
	LogCompress    bool     // 是否压缩旧日志文件
}

// AppConfig 全局配置实例
var AppConfig *Config

// Load 初始化并加载应用配置
// 加载优先级: 环境变量 > .env 文件 > 系统默认值
// 默认值逻辑:
// - 数据库路径: macOS (~/Library/Application Support/FruitsAI/Orange/orange.db), Windows (%APPDATA%/FruitsAI/Orange/orange.db)
// - 日志路径: 同上，位于 log 子目录下
func Load() {
	// 尝试加载 .env 文件，如果不存在则忽略错误（使用默认值或环境变量）
	err := godotenv.Load()
	if err != nil {
		log.Println("Info: .env file not found, utilizing environment variables or default values")
	}

	// 计算默认数据库路径和日志路径
	defaultDBPath := "orange.db"
	defaultLogPath := "orange.log"

	// 获取用户配置目录 (User Config Directory)
	configDir, err := os.UserConfigDir()
	if err == nil {
		// macOS: ~/Library/Application Support/FruitsAI/Orange
		// Windows: %APPDATA%\FruitsAI\Orange
		appDir := filepath.Join(configDir, "FruitsAI", "Orange")
		if err := os.MkdirAll(appDir, 0700); err == nil {
			defaultDBPath = filepath.Join(appDir, "orange.db")

			// 日志放到 log 子目录
			logDir := filepath.Join(appDir, "log")
			if err := os.MkdirAll(logDir, 0700); err == nil {
				defaultLogPath = filepath.Join(logDir, "orange.log")
			} else {
				defaultLogPath = filepath.Join(appDir, "orange.log")
			}
		} else {
			log.Printf("Warning: Failed to create app config dir: %v\n", err)
		}
	} else {
		log.Printf("Warning: Failed to get user config dir: %v\n", err)
	}

	// 默认 CORS 允许的源
	defaultAllowedOrigins := []string{"http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"}

	// 从环境变量读取 CORS 配置
	allowedOriginsEnv := getEnv("ALLOWED_ORIGINS", "")
	var allowedOrigins []string
	if allowedOriginsEnv != "" {
		// 支持逗号分隔的多个域名
		for _, origin := range splitAndTrim(allowedOriginsEnv, ",") {
			allowedOrigins = append(allowedOrigins, origin)
		}
	} else {
		allowedOrigins = defaultAllowedOrigins
	}

	// 组装配置对象，优先从环境变量读取
	AppConfig = &Config{
		// 数据库配置
		DBType:       getEnv("DB_TYPE", "sqlite"),
		DBPath:       getEnv("DB_PATH", defaultDBPath),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       int(getEnvInt("DB_PORT", 3306)),
		DBUser:       getEnv("DB_USER", "root"),
		DBPassword:   getEnv("DB_PASSWORD", ""),
		DBName:       getEnv("DB_NAME", "orange"),
		DBSSLMode:    getEnv("DB_SSL_MODE", "disable"),
		DBAutoCreate: getEnvBool("DB_AUTO_CREATE", true),

		APIServerPort:   int(getEnvInt("API_SERVER_PORT", 3456)),
		EnableAPIServer: getEnvBool("ENABLE_API_SERVER", true),

		JWTSecret:      loadJWTSecret(),
		AllowedOrigins: allowedOrigins,
		TokenExpiry:    getEnvInt("TOKEN_EXPIRY", 24),
		LogEnable:      getEnvBool("LOG_ENABLE", true),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		GitHubRepo:     getEnv("GITHUB_REPO", "FruitsAI/Orange"),
		LogPath:        getEnv("LOG_PATH", defaultLogPath),
		LogMaxSize:     int(getEnvInt("LOG_MAX_SIZE", 10)),   // 10MB
		LogMaxBackups:  int(getEnvInt("LOG_MAX_BACKUPS", 5)), // 5 files
		LogMaxAge:      int(getEnvInt("LOG_MAX_AGE", 30)),    // 30 days
		LogCompress:    getEnvBool("LOG_COMPRESS", true),     // Compress by default
	}

	// 安全检查：生产环境必须修改默认 JWT 密钥
	if envSecret, exists := os.LookupEnv("JWT_SECRET"); exists && envSecret == "orange-secret-key-change-in-production" {
		env := getEnv("ENV", "development")
		if env == "production" {
			log.Fatal("🚨 FATAL: JWT_SECRET must be set in production environment")
		} else {
			log.Printf("⚠️  WARNING: Using default JWT secret in %s environment. Please set JWT_SECRET in production!", env)
		}
	}

	// JWT 密钥长度检查
	if len(AppConfig.JWTSecret) < 32 {
		log.Printf("⚠️  WARNING: JWT secret is short (<%d chars). Consider using a longer key for better security.", 32)
	}
}

// getEnvBool 获取布尔类型的环境变量
func loadJWTSecret() string {
	if value, exists := os.LookupEnv("JWT_SECRET"); exists && value != "" {
		return value
	}
	secret, err := generateRandomSecret()
	if err != nil {
		log.Printf("Warning: failed to generate random JWT secret, using fallback: %v\n", err)
		return "orange-runtime-secret-fallback-change-me"
	}
	log.Println("Info: JWT_SECRET is not set; using a random runtime secret")
	return secret
}

func generateRandomSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf), nil
}

func getEnvBool(key string, fallback bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return fallback
}

// getEnvInt 获取整数类型的环境变量
func getEnvInt(key string, fallback int64) int64 {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return fallback
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// splitAndTrim 分割字符串并去除空白
func splitAndTrim(s string, sep string) []string {
	parts := []string{}
	for _, part := range strings.Split(s, sep) {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}
