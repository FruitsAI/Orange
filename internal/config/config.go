package config

import (
	"log"
	"os"
	"path/filepath"
	"strconv"

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

	JWTSecret     string // JWT 签名密钥
	TokenExpiry   int64  // Token 有效期 (单位: 小时)
	LogEnable     bool   // 是否启用请求日志
	LogLevel      string // 日志级别: debug, info, warn, error
	GitHubRepo    string // 用于检查更新的 GitHub 仓库地址 (格式: owner/repo)
	LogPath       string // 日志文件输出路径
	LogMaxSize    int    // 单个日志文件最大大小 (MB)
	LogMaxBackups int    // 保留旧日志文件的最大个数
	LogMaxAge     int    // 保留旧日志文件的最大天数
	LogCompress   bool   // 是否压缩旧日志文件
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
		if err := os.MkdirAll(appDir, 0755); err == nil {
			defaultDBPath = filepath.Join(appDir, "orange.db")

			// 日志放到 log 子目录
			logDir := filepath.Join(appDir, "log")
			if err := os.MkdirAll(logDir, 0755); err == nil {
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

		JWTSecret:     getEnv("JWT_SECRET", "orange-secret-key-change-in-production"),
		TokenExpiry:   getEnvInt("TOKEN_EXPIRY", 24),
		LogEnable:     getEnvBool("LOG_ENABLE", true),
		LogLevel:      getEnv("LOG_LEVEL", "debug"),
		GitHubRepo:    getEnv("GITHUB_REPO", "FruitsAI/Orange"),
		LogPath:       getEnv("LOG_PATH", defaultLogPath),
		LogMaxSize:    int(getEnvInt("LOG_MAX_SIZE", 10)),   // 10MB
		LogMaxBackups: int(getEnvInt("LOG_MAX_BACKUPS", 5)), // 5 files
		LogMaxAge:     int(getEnvInt("LOG_MAX_AGE", 30)),    // 30 days
		LogCompress:   getEnvBool("LOG_COMPRESS", true),     // Compress by default
	}
}

// getEnvBool 获取布尔类型的环境变量
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
