package config

import (
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// Config 应用配置
type Config struct {
	DBPath      string
	JWTSecret   string
	TokenExpiry int64 // 单位：小时
	LogEnable   bool
	LogLevel    string
	GitHubRepo  string
}

// AppConfig 全局配置实例
var AppConfig *Config

// Load 加载配置
func Load() {
	// 尝试加载 .env 文件，如果不存在则忽略错误（使用默认值或环境变量）
	err := godotenv.Load()
	if err != nil {
		log.Println("Info: .env file not found, utilizing environment variables or default values")
	}

	// 计算默认数据库路径
	defaultDBPath := "orange.db"
	configDir, err := os.UserConfigDir()
	if err == nil {
		// macOS: ~/Library/Application Support/FruitsAI/Orange
		// Windows: %APPDATA%\FruitsAI\Orange
		appDir := filepath.Join(configDir, "FruitsAI", "Orange")
		if err := os.MkdirAll(appDir, 0755); err == nil {
			defaultDBPath = filepath.Join(appDir, "orange.db")
		} else {
			log.Printf("Warning: Failed to create app config dir: %v\n", err)
		}
	} else {
		log.Printf("Warning: Failed to get user config dir: %v\n", err)
	}

	AppConfig = &Config{
		DBPath:      getEnv("DB_PATH", defaultDBPath),
		JWTSecret:   getEnv("JWT_SECRET", "orange-secret-key-change-in-production"),
		TokenExpiry: getEnvInt("TOKEN_EXPIRY", 24),
		LogEnable:   getEnvBool("LOG_ENABLE", true),
		LogLevel:    getEnv("LOG_LEVEL", "debug"),
		GitHubRepo:  getEnv("GITHUB_REPO", "FruitsAI/Orange"),
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
