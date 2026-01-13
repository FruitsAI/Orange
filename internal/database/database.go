package database

import (
	"database/sql"
	"fmt"
	"log/slog"
	"sync"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/glebarez/sqlite"
	_ "github.com/jackc/pgx/v5/stdlib" // 注册 pgx 驱动到 database/sql
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	// db 是全局唯一的数据库连接实例 (单例模式)
	db *gorm.DB
	// once 用于确保数据库初始化只执行一次
	once sync.Once
)

// GetDB 获取数据库连接实例 (单例)
// 该方法是并发安全的，首次调用时会自动初始化数据库连接。
func GetDB() *gorm.DB {
	once.Do(func() {
		var err error
		db, err = initDB()
		if err != nil {
			slog.Error("Failed to initialize database", "error", err)
			// 数据库是核心依赖，初始化失败直接 Panic 终止应用
			panic(err)
		}
	})
	return db
}

// GetDBType 获取当前数据库类型
func GetDBType() string {
	return config.AppConfig.DBType
}

// initDB 初始化数据库连接
// 根据配置选择对应的数据库驱动 (SQLite/MySQL/PostgreSQL)
func initDB() (*gorm.DB, error) {
	cfg := config.AppConfig
	var dialector gorm.Dialector

	switch cfg.DBType {
	case "mysql":
		// 根据配置决定是否自动创建数据库
		if cfg.DBAutoCreate {
			if err := ensureMySQLDatabase(cfg); err != nil {
				return nil, fmt.Errorf("failed to ensure MySQL database: %w", err)
			}
		}
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)
		dialector = mysql.Open(dsn)
		slog.Info("Connecting to MySQL database", "host", cfg.DBHost, "port", cfg.DBPort, "database", cfg.DBName)

	case "postgres":
		// 根据配置决定是否自动创建数据库
		if cfg.DBAutoCreate {
			if err := ensurePostgresDatabase(cfg); err != nil {
				return nil, fmt.Errorf("failed to ensure PostgreSQL database: %w", err)
			}
		}
		dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Shanghai",
			cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)
		dialector = postgres.Open(dsn)
		slog.Info("Connecting to PostgreSQL database", "host", cfg.DBHost, "port", cfg.DBPort, "database", cfg.DBName, "sslmode", cfg.DBSSLMode)

	default: // sqlite
		slog.Info("Opening SQLite database", "path", cfg.DBPath)
		dialector = sqlite.Open(cfg.DBPath)
	}

	// 建立 GORM 连接
	database, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	return database, nil
}

// ensureMySQLDatabase 确保 MySQL 数据库存在，不存在则自动创建
func ensureMySQLDatabase(cfg *config.Config) error {
	// 连接到 MySQL 服务器 (不指定数据库)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	// 创建数据库 (如果不存在)
	createSQL := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", cfg.DBName)
	_, err = db.Exec(createSQL)
	if err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}

	slog.Info("MySQL database ensured", "database", cfg.DBName)
	return nil
}

// ensurePostgresDatabase 确保 PostgreSQL 数据库存在，不存在则自动创建
func ensurePostgresDatabase(cfg *config.Config) error {
	// 连接到 postgres 默认数据库
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=postgres sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBSSLMode)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	// 检查数据库是否存在
	var exists bool
	checkSQL := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '%s')", cfg.DBName)
	err = db.QueryRow(checkSQL).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check database existence: %w", err)
	}

	// 不存在则创建
	if !exists {
		createSQL := fmt.Sprintf("CREATE DATABASE %s WITH ENCODING 'UTF8'", cfg.DBName)
		_, err = db.Exec(createSQL)
		if err != nil {
			return fmt.Errorf("failed to create database: %w", err)
		}
		slog.Info("PostgreSQL database created", "database", cfg.DBName)
	} else {
		slog.Info("PostgreSQL database already exists", "database", cfg.DBName)
	}

	return nil
}

// Close 关闭数据库连接
// 主要是为了释放底层 sql.DB 的连接资源 (通常在应用退出时调用)
func Close() error {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
