package main

import (
	"fmt"
	"log"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"gorm.io/gorm"
)

func main() {
	config.Load()

	db := database.GetDB()

	fmt.Println("开始添加数据库索引...")

	// 项目表索引
	fmt.Println("1. 添加项目表索引...")

	// user_id索引（用于数据隔离查询）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)").Error; err != nil {
		log.Printf("创建 idx_projects_user_id 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_projects_user_id")
	}

	// status索引（用于状态筛选）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)").Error; err != nil {
		log.Printf("创建 idx_projects_status 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_projects_status")
	}

	// user_id + status组合索引（用于按用户和状态查询）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status)").Error; err != nil {
		log.Printf("创建 idx_projects_user_status 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_projects_user_status")
	}

	// contract_number索引（用于唯一性校验）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON projects(contract_number)").Error; err != nil {
		log.Printf("创建 idx_projects_contract_number 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_projects_contract_number")
	}

	// 款项表索引
	fmt.Println("2. 添加款项表索引...")

	// project_id索引（用于关联查询）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id)").Error; err != nil {
		log.Printf("创建 idx_payments_project_id 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_payments_project_id")
	}

	// status索引（用于状态筛选）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)").Error; err != nil {
		log.Printf("创建 idx_payments_status 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_payments_status")
	}

	// plan_date索引（用于日期范围查询）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_payments_plan_date ON payments(plan_date)").Error; err != nil {
		log.Printf("创建 idx_payments_plan_date 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_payments_plan_date")
	}

	// actual_date索引（用于实际收款日期查询）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_payments_actual_date ON payments(actual_date)").Error; err != nil {
		log.Printf("创建 idx_payments_actual_date 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_payments_actual_date")
	}

	// project_id + status组合索引（用于查询项目的特定状态款项）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_payments_project_status ON payments(project_id, status)").Error; err != nil {
		log.Printf("创建 idx_payments_project_status 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_payments_project_status")
	}

	// 用户表索引
	fmt.Println("3. 添加用户表索引...")

	// username索引（用于登录查询）
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)").Error; err != nil {
		log.Printf("创建 idx_users_username 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_users_username (UNIQUE)")
	}

	// email索引（用于邮箱查询和唯一性校验）
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)").Error; err != nil {
		log.Printf("创建 idx_users_email 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_users_email (UNIQUE)")
	}

	// phone索引（如果使用手机号登录）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)").Error; err != nil {
		log.Printf("创建 idx_users_phone 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_users_phone")
	}

	// 通知表索引
	fmt.Println("4. 添加通知表索引...")

	// target_user_id索引（用于查询用户通知）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id)").Error; err != nil {
		log.Printf("创建 idx_notifications_target_user 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_notifications_target_user")
	}

	// type索引（用于按类型筛选）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)").Error; err != nil {
		log.Printf("创建 idx_notifications_type 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_notifications_type")
	}

	// created_at索引（用于按时间排序）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)").Error; err != nil {
		log.Printf("创建 idx_notifications_created_at 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_notifications_created_at")
	}

	// 通知读取状态表索引
	fmt.Println("5. 添加通知读取状态表索引...")

	// notification_id + user_id组合索引（用于查询用户的通知状态）
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_user ON notification_reads(notification_id, user_id)").Error; err != nil {
		log.Printf("创建 idx_notification_reads_notification_user 失败: %v", err)
	} else {
		fmt.Println("   ✓ idx_notification_reads_notification_user")
	}

	fmt.Println("\n索引添加完成!")

	// 验证索引
	fmt.Println("\n验证索引...")
	var indexes []struct {
		Name string
		SQL  string
	}

	// 查询所有索引
	if err := db.Raw("SELECT name, sql FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").Scan(&indexes).Error; err != nil {
		log.Printf("查询索引失败: %v", err)
	} else {
		fmt.Printf("共创建 %d 个索引:\n", len(indexes))
		for _, idx := range indexes {
			fmt.Printf("  - %s\n", idx.Name)
		}
	}

	// 分析表统计信息（优化查询计划）
	fmt.Println("\n更新表统计信息...")
	tables := []string{"projects", "payments", "users", "notifications", "notification_reads"}
	for _, table := range tables {
		if err := db.Exec(fmt.Sprintf("ANALYZE %s", table)).Error; err != nil {
			log.Printf("分析表 %s 失败: %v", table, err)
		} else {
			fmt.Printf("  ✓ %s\n", table)
		}
	}

	fmt.Println("\n数据库优化完成!")

	// 性能测试（可选）
	fmt.Println("\n性能测试...")
	testDatabasePerformance(db)
}

func testDatabasePerformance(db *gorm.DB) {
	fmt.Println("1. 测试项目查询性能...")
	start := time.Now()
	var projects []models.Project
	db.Where("user_id = ? AND status = ?", 1, "ongoing").Limit(10).Find(&projects)
	fmt.Printf("   查询时间: %v\n", time.Since(start))

	fmt.Println("2. 测试款项查询性能...")
	start = time.Now()
	var payments []models.Payment
	db.Where("project_id = ? AND status = ?", 1, "pending").Order("plan_date ASC").Limit(10).Find(&payments)
	fmt.Printf("   查询时间: %v\n", time.Since(start))

	fmt.Println("3. 测试用户查询性能...")
	start = time.Now()
	var user models.User
	db.Where("username = ?", "testuser").First(&user)
	fmt.Printf("   查询时间: %v\n", time.Since(start))
}
