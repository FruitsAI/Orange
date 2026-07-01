package database

import (
	"crypto/rand"
	"fmt"
	"log/slog"
	"math/big"
	"os"
	"path/filepath"

	"github.com/FruitsAI/Orange/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Seed 填充数据库初始数据
// 该函数在应用启动且数据库表为空时执行，用于预置管理员账号、字典数据等。
// 类似于 Rails 的 db:seed 或 Laravel 的 seeder。
func Seed(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	slog.Info("Seeding database...")

	// 生成随机强密码
	adminPassword := generateStrongPassword(16)
	userPassword := generateStrongPassword(16)
	credentialsPath := writeInitialCredentials(adminPassword, userPassword)
	realAdminPassword := adminPassword
	realUserPassword := userPassword
	adminPassword = "[written-to-initial-credentials-file]"
	userPassword = "[written-to-initial-credentials-file]"

	// 输出默认密码到日志（仅首次启动）
	slog.Warn("=" + "===========================================")
	slog.Warn("首次启动检测到空数据库，已创建默认用户")
	slog.Warn("管理员账号: admin")
	slog.Warn(fmt.Sprintf("管理员密码: %s", adminPassword))
	slog.Warn("普通用户账号: xu")
	slog.Warn(fmt.Sprintf("普通用户密码: %s", userPassword))
	slog.Warn("请立即登录并修改默认密码！")
	slog.Warn("=" + "===========================================")

	// 对密码进行 bcrypt 加密
	if credentialsPath != "" {
		slog.Warn("initial credentials file", "path", credentialsPath)
	}
	adminPassword = realAdminPassword
	userPassword = realUserPassword
	adminPasswordHash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	userPasswordHash, err := bcrypt.GenerateFromPassword([]byte(userPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// 1. 初始化用户数据 (Users)
		// 包含:
		// - 默认管理员 (admin)
		// - 演示用户 (xu)
		usersSQL := []string{
			fmt.Sprintf(`INSERT INTO users (id, username, password, name, email, phone, role, department, position, status, create_time) VALUES
(1, 'admin', '%s', '管理员', 'admin@orange.com', '13800000000', 'admin', '技术部', '系统管理员', 1, CURRENT_TIMESTAMP);`, string(adminPasswordHash)),
			fmt.Sprintf(`INSERT INTO users (id, username, password, name, email, phone, role, department, position, status, create_time) VALUES
(2, 'xu', '%s', '郑旭', 'xu@company.com', '13800000001', 'user', '技术部', '项目经理', 1, CURRENT_TIMESTAMP);`, string(userPasswordHash)),
		}

		for _, sql := range usersSQL {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}

		// 2. 初始化字典数据 (Dictionaries)
		// 对应 SQL 文件: db/seed_dictionaries.sql
		// 包含: 款项阶段、支付方式、项目状态、项目类型等基础配置
		dictSQL := []string{
			// payment_stage
			`INSERT INTO dictionaries (id, code, name, status, create_time) VALUES (1, 'payment_stage', '款项阶段', 1, CURRENT_TIMESTAMP);`,
			`INSERT INTO dictionary_item (dictionary_id, label, value, sort, status, create_time) VALUES
(1, '首付款', 'deposit', 1, 1, CURRENT_TIMESTAMP),
(1, '进度款', 'progress', 2, 1, CURRENT_TIMESTAMP),
(1, '尾款', 'final', 3, 1, CURRENT_TIMESTAMP),
(1, '全款', 'all', 4, 1, CURRENT_TIMESTAMP);`,
			// payment_method
			`INSERT INTO dictionaries (id, code, name, status, create_time) VALUES (2, 'payment_method', '支付方式', 1, CURRENT_TIMESTAMP);`,
			`INSERT INTO dictionary_item (dictionary_id, label, value, sort, status, create_time) VALUES
(2, '银行转账', 'bank_transfer', 1, 1, CURRENT_TIMESTAMP),
(2, '支付宝', 'alipay', 2, 1, CURRENT_TIMESTAMP),
(2, '微信支付', 'wechat', 3, 1, CURRENT_TIMESTAMP),
(2, '现金', 'cash', 4, 1, CURRENT_TIMESTAMP);`,
			// project_status
			`INSERT INTO dictionaries (id, code, name, status, create_time) VALUES (3, 'project_status', '项目状态', 1, CURRENT_TIMESTAMP);`,
			`INSERT INTO dictionary_item (dictionary_id, label, value, sort, status, create_time) VALUES
(3, '未开始', 'notstarted', 1, 1, CURRENT_TIMESTAMP),
(3, '进行中', 'active', 2, 1, CURRENT_TIMESTAMP),
(3, '已完成', 'completed', 3, 1, CURRENT_TIMESTAMP),
(3, '已逾期', 'overdue', 4, 1, CURRENT_TIMESTAMP),
(3, '已归档', 'archived', 5, 1, CURRENT_TIMESTAMP);`,
			// project_type
			`INSERT INTO dictionaries (id, code, name, status, create_time) VALUES (4, 'project_type', '项目类型', 1, CURRENT_TIMESTAMP);`,
			`INSERT INTO dictionary_item (dictionary_id, label, value, sort, status, create_time) VALUES
(4, 'Web开发', 'web', 1, 1, CURRENT_TIMESTAMP),
(4, '移动应用', 'mobile', 2, 1, CURRENT_TIMESTAMP),
(4, 'UI设计', 'design', 3, 1, CURRENT_TIMESTAMP),
(4, 'SaaS系统', 'saas', 4, 1, CURRENT_TIMESTAMP),
(4, '其他', 'other', 5, 1, CURRENT_TIMESTAMP);`,
		}

		for _, sql := range dictSQL {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// generateStrongPassword 生成随机强密码
// 密码包含大小写字母、数字和特殊字符，满足强密码要求
func writeInitialCredentials(adminPassword, userPassword string) string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		slog.Error("failed to get user config dir for initial credentials", "error", err)
		return ""
	}
	appDir := filepath.Join(configDir, "FruitsAI", "Orange")
	if err := os.MkdirAll(appDir, 0700); err != nil {
		slog.Error("failed to create initial credentials dir", "error", err)
		return ""
	}
	path := filepath.Join(appDir, "initial-credentials.txt")
	content := fmt.Sprintf("admin: %s\nxu: %s\n", adminPassword, userPassword)
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		slog.Error("failed to write initial credentials file", "error", err)
		return ""
	}
	return path
}

func generateStrongPassword(length int) string {
	const (
		upperChars   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		lowerChars   = "abcdefghijklmnopqrstuvwxyz"
		digitChars   = "0123456789"
		specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?"
	)

	allChars := upperChars + lowerChars + digitChars + specialChars

	// 确保至少包含每种类型的字符
	password := make([]byte, length)
	password[0] = upperChars[randomInt(len(upperChars))]
	password[1] = lowerChars[randomInt(len(lowerChars))]
	password[2] = digitChars[randomInt(len(digitChars))]
	password[3] = specialChars[randomInt(len(specialChars))]

	// 填充剩余字符
	for i := 4; i < length; i++ {
		password[i] = allChars[randomInt(len(allChars))]
	}

	// 打乱顺序
	for i := length - 1; i > 0; i-- {
		j := randomInt(i + 1)
		password[i], password[j] = password[j], password[i]
	}

	return string(password)
}

// randomInt 生成 [0, max) 范围内的随机整数
func randomInt(max int) int {
	n, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		// 如果随机数生成失败，使用备用方案
		return 0
	}
	return int(n.Int64())
}
