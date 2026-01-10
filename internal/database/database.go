package database

import (
	"log/slog"
	"sync"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	db   *gorm.DB
	once sync.Once
)

// GetDB returns the singleton database instance
func GetDB() *gorm.DB {
	once.Do(func() {
		var err error
		db, err = initDB()
		if err != nil {
			slog.Error("Failed to initialize database", "error", err)
			panic(err)
		}
	})
	return db
}

// initDB initializes the SQLite database
func initDB() (*gorm.DB, error) {
	// 使用配置中的数据库路径
	dbPath := config.AppConfig.DBPath
	slog.Info("Opening database", "path", dbPath)

	// Open database connection
	database, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	return database, nil
}

// Close closes the database connection
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
