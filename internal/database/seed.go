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
		// 使用 GORM 模型创建，不显式指定自增主键 id，
		// 以保证在 PostgreSQL/MySQL 下自增序列正确前进，避免后续注册主键冲突。
		users := []models.User{
			{Username: "admin", Password: string(adminPasswordHash), Name: "管理员", Email: "admin@orange.com", Phone: "13800000000", Role: "admin", Department: "技术部", Position: "系统管理员", Status: 1},
			{Username: "xu", Password: string(userPasswordHash), Name: "郑旭", Email: "xu@company.com", Phone: "13800000001", Role: "user", Department: "技术部", Position: "项目经理", Status: 1},
		}
		if err := tx.Create(&users).Error; err != nil {
			return err
		}

		// 2. 初始化字典数据 (Dictionaries)
		// 每个字典及其明细项通过关联(Items)一次性创建，字典项的 dictionary_id
		// 由 GORM 依据字典创建后分配的主键自动回填，无需硬编码外键。
		dictionaries := []models.Dictionary{
			{Code: "payment_stage", Name: "款项阶段", Status: 1, Items: []models.DictionaryItem{
				{Label: "首付款", Value: "deposit", Sort: 1, Status: 1},
				{Label: "进度款", Value: "progress", Sort: 2, Status: 1},
				{Label: "尾款", Value: "final", Sort: 3, Status: 1},
				{Label: "全款", Value: "all", Sort: 4, Status: 1},
			}},
			{Code: "payment_method", Name: "支付方式", Status: 1, Items: []models.DictionaryItem{
				{Label: "银行转账", Value: "bank_transfer", Sort: 1, Status: 1},
				{Label: "支付宝", Value: "alipay", Sort: 2, Status: 1},
				{Label: "微信支付", Value: "wechat", Sort: 3, Status: 1},
				{Label: "现金", Value: "cash", Sort: 4, Status: 1},
			}},
			{Code: "project_status", Name: "项目状态", Status: 1, Items: []models.DictionaryItem{
				{Label: "未开始", Value: "notstarted", Sort: 1, Status: 1},
				{Label: "进行中", Value: "active", Sort: 2, Status: 1},
				{Label: "已完成", Value: "completed", Sort: 3, Status: 1},
				{Label: "已逾期", Value: "overdue", Sort: 4, Status: 1},
				{Label: "已归档", Value: "archived", Sort: 5, Status: 1},
			}},
			{Code: "project_type", Name: "项目类型", Status: 1, Items: []models.DictionaryItem{
				{Label: "Web开发", Value: "web", Sort: 1, Status: 1},
				{Label: "移动应用", Value: "mobile", Sort: 2, Status: 1},
				{Label: "UI设计", Value: "design", Sort: 3, Status: 1},
				{Label: "SaaS系统", Value: "saas", Sort: 4, Status: 1},
				{Label: "其他", Value: "other", Sort: 5, Status: 1},
			}},
		}
		if err := tx.Create(&dictionaries).Error; err != nil {
			return err
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
