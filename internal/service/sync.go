package service

import (
	"database/sql"
	"fmt"

	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/jackc/pgx/v5/stdlib"
	"gorm.io/gorm"
)

// SyncConfig 云端数据库连接配置
type SyncConfig struct {
	DBType   string `json:"db_type"`  // postgres, mysql
	Host     string `json:"host"`     // 主机地址
	Port     int    `json:"port"`     // 端口号
	User     string `json:"user"`     // 用户名
	Password string `json:"password"` // 密码
	DBName   string `json:"db_name"`  // 数据库名
	SSLMode  string `json:"ssl_mode"` // SSL 模式 (postgres: disable/require)
}

// TableCompareResult 表对比结果
type TableCompareResult struct {
	TableName   string `json:"table_name"`   // 表名
	LocalCount  int64  `json:"local_count"`  // 本地记录数
	RemoteCount int64  `json:"remote_count"` // 云端记录数
}

// SyncResult 同步结果
type SyncResult struct {
	TableName    string `json:"table_name"`    // 表名
	SyncedCount  int64  `json:"synced_count"`  // 同步记录数
	Success      bool   `json:"success"`       // 是否成功
	ErrorMessage string `json:"error_message"` // 错误信息
}

// SyncService 数据同步服务
type SyncService struct{}

// NewSyncService 创建同步服务实例
func NewSyncService() *SyncService {
	return &SyncService{}
}

// buildDSN 根据配置构建数据库连接字符串
func (s *SyncService) buildDSN(cfg SyncConfig) string {
	switch cfg.DBType {
	case "mysql":
		return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)
	case "postgres":
		sslMode := cfg.SSLMode
		if sslMode == "" {
			sslMode = "require" // 云端默认开启 SSL
		}
		return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, sslMode)
	default:
		return ""
	}
}

// getDriverName 获取对应的驱动名称
func (s *SyncService) getDriverName(dbType string) string {
	switch dbType {
	case "mysql":
		return "mysql"
	case "postgres":
		return "pgx"
	default:
		return ""
	}
}

// TestConnection 测试云端数据库连接
func (s *SyncService) TestConnection(cfg SyncConfig) error {
	driver := s.getDriverName(cfg.DBType)
	if driver == "" {
		return fmt.Errorf("不支持的数据库类型: %s", cfg.DBType)
	}

	dsn := s.buildDSN(cfg)
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer db.Close()

	// 验证连接
	if err := db.Ping(); err != nil {
		return fmt.Errorf("连接测试失败: %w", err)
	}

	return nil
}

// CompareData 对比本地与云端表的记录数
func (s *SyncService) CompareData(cfg SyncConfig) ([]TableCompareResult, error) {
	// 连接云端数据库
	driver := s.getDriverName(cfg.DBType)
	if driver == "" {
		return nil, fmt.Errorf("不支持的数据库类型: %s", cfg.DBType)
	}

	dsn := s.buildDSN(cfg)
	remoteDB, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("连接云端数据库失败: %w", err)
	}
	defer remoteDB.Close()

	// 获取本地数据库
	localDB := database.GetDB()

	// 要对比的表
	tables := []string{"users", "projects", "payments", "dictionaries", "dictionary_item", "notifications", "user_notifications"}
	results := make([]TableCompareResult, 0, len(tables))

	for _, table := range tables {
		result := TableCompareResult{TableName: table}

		// 本地计数
		var localCount int64
		localDB.Table(table).Count(&localCount)
		result.LocalCount = localCount

		// 云端计数 (表可能不存在)
		var remoteCount int64
		row := remoteDB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", table))
		if err := row.Scan(&remoteCount); err != nil {
			result.RemoteCount = -1 // -1 表示表不存在或查询失败
		} else {
			result.RemoteCount = remoteCount
		}

		results = append(results, result)
	}

	return results, nil
}

// SyncTables 执行数据同步
func (s *SyncService) SyncTables(cfg SyncConfig, tables []string) ([]SyncResult, error) {
	// 连接云端数据库
	driver := s.getDriverName(cfg.DBType)
	if driver == "" {
		return nil, fmt.Errorf("不支持的数据库类型: %s", cfg.DBType)
	}

	dsn := s.buildDSN(cfg)
	remoteDB, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("连接云端数据库失败: %w", err)
	}
	defer remoteDB.Close()

	// 获取本地数据库
	localDB := database.GetDB()
	results := make([]SyncResult, 0, len(tables))

	for _, table := range tables {
		result := SyncResult{TableName: table, Success: true}

		switch table {
		case "users":
			result.SyncedCount, result.ErrorMessage = s.syncUsers(localDB, remoteDB, cfg.DBType)
		case "projects":
			result.SyncedCount, result.ErrorMessage = s.syncProjects(localDB, remoteDB, cfg.DBType)
		case "payments":
			result.SyncedCount, result.ErrorMessage = s.syncPayments(localDB, remoteDB, cfg.DBType)
		case "dictionaries":
			result.SyncedCount, result.ErrorMessage = s.syncDictionaries(localDB, remoteDB, cfg.DBType)
		case "dictionary_item":
			result.SyncedCount, result.ErrorMessage = s.syncDictionaryItems(localDB, remoteDB, cfg.DBType)
		case "notifications":
			result.SyncedCount, result.ErrorMessage = s.syncNotifications(localDB, remoteDB, cfg.DBType)
		case "user_notifications":
			result.SyncedCount, result.ErrorMessage = s.syncUserNotifications(localDB, remoteDB, cfg.DBType)
		default:
			result.ErrorMessage = "未知表名"
		}

		if result.ErrorMessage != "" {
			result.Success = false
		}
		results = append(results, result)
	}

	return results, nil
}

// deleteExtras 删除云端多余的数据
func (s *SyncService) deleteExtras(remoteDB *sql.DB, table string, keepIDs []interface{}, dbType string) error {
	if len(keepIDs) == 0 {
		_, err := remoteDB.Exec(fmt.Sprintf("DELETE FROM %s", table))
		return err
	}

	// 简单的分批处理，防止 SQL 过长 (假设每批 500)
	// 这里简化处理，直接拼接。对于大量数据建议分批或使用临时表。
	// 注意：PostgreSQL $1, $2... 占位符处理比较麻烦，因为需要动态生成序号。
	// 为简单起见，这里假设 ID 数量不会非常巨大，直接拼接值（注意防止注入，ID是数字相对安全，但最好还是参数化）。
	// 鉴于 Wails 应用场景，我们使用参数化查询。

	query := fmt.Sprintf("DELETE FROM %s WHERE id NOT IN (", table)
	args := make([]interface{}, len(keepIDs))

	for i, id := range keepIDs {
		args[i] = id
		if i > 0 {
			query += ","
		}
		if dbType == "postgres" {
			query += fmt.Sprintf("$%d", i+1)
		} else {
			query += "?"
		}
	}
	query += ")"

	_, err := remoteDB.Exec(query, args...)
	return err
}

// syncUsers 同步用户表
func (s *SyncService) syncUsers(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var users []models.User
	if err := localDB.Find(&users).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, u := range users {
		ids = append(ids, u.ID)
		query := s.buildUpsertQuery("users", []string{"id", "username", "password", "name", "email", "phone", "avatar", "role", "department", "position", "status", "create_time", "update_time"}, dbType)
		_, err := remoteDB.Exec(query, u.ID, u.Username, u.Password, u.Name, u.Email, u.Phone, u.Avatar, u.Role, u.Department, u.Position, u.Status, u.CreateTime, u.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	// 删除多余数据
	if err := s.deleteExtras(remoteDB, "users", ids, dbType); err != nil {
		// 忽略删除错误，可能是外键约束，下次同步解决
		fmt.Printf("清理 users 多余数据失败: %v\n", err)
	}

	return int64(len(users)), ""
}

// syncProjects 同步项目表
func (s *SyncService) syncProjects(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var projects []models.Project
	if err := localDB.Find(&projects).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, p := range projects {
		ids = append(ids, p.ID)
		query := s.buildUpsertQuery("projects", []string{"id", "name", "company", "total_amount", "received_amount", "status", "type", "contract_number", "contract_date", "payment_method", "start_date", "end_date", "description", "user_id", "create_time", "update_time"}, dbType)
		_, err := remoteDB.Exec(query, p.ID, p.Name, p.Company, p.TotalAmount, p.ReceivedAmount, p.Status, p.Type, p.ContractNumber, p.ContractDate, p.PaymentMethod, p.StartDate, p.EndDate, p.Description, p.UserID, p.CreateTime, p.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(remoteDB, "projects", ids, dbType); err != nil {
		fmt.Printf("清理 projects 多余数据失败: %v\n", err)
	}

	return int64(len(projects)), ""
}

// syncPayments 同步收款表
func (s *SyncService) syncPayments(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var payments []models.Payment
	if err := localDB.Find(&payments).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, p := range payments {
		ids = append(ids, p.ID)
		query := s.buildUpsertQuery("payments", []string{"id", "project_id", "stage", "amount", "percentage", "plan_date", "status", "actual_date", "method", "remark", "user_id", "create_time", "update_time"}, dbType)
		_, err := remoteDB.Exec(query, p.ID, p.ProjectID, p.Stage, p.Amount, p.Percentage, p.PlanDate, p.Status, p.ActualDate, p.Method, p.Remark, p.UserID, p.CreateTime, p.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(remoteDB, "payments", ids, dbType); err != nil {
		fmt.Printf("清理 payments 多余数据失败: %v\n", err)
	}

	return int64(len(payments)), ""
}

// syncDictionaries 同步字典表
func (s *SyncService) syncDictionaries(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var dicts []models.Dictionary
	if err := localDB.Find(&dicts).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, d := range dicts {
		ids = append(ids, d.ID)
		query := s.buildUpsertQuery("dictionaries", []string{"id", "code", "name", "status", "remark", "create_time", "update_time"}, dbType)
		_, err := remoteDB.Exec(query, d.ID, d.Code, d.Name, d.Status, d.Remark, d.CreateTime, d.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(remoteDB, "dictionaries", ids, dbType); err != nil {
		fmt.Printf("清理 dictionaries 多余数据失败: %v\n", err)
	}

	return int64(len(dicts)), ""
}

// syncDictionaryItems 同步字典项表
func (s *SyncService) syncDictionaryItems(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var items []models.DictionaryItem
	if err := localDB.Find(&items).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, item := range items {
		ids = append(ids, item.ID)
		query := s.buildUpsertQuery("dictionary_item", []string{"id", "dictionary_id", "label", "value", "sort", "status", "remark", "create_time", "update_time"}, dbType)
		_, err := remoteDB.Exec(query, item.ID, item.DictionaryID, item.Label, item.Value, item.Sort, item.Status, item.Remark, item.CreateTime, item.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(remoteDB, "dictionary_item", ids, dbType); err != nil {
		fmt.Printf("清理 dictionary_item 多余数据失败: %v\n", err)
	}

	return int64(len(items)), ""
}

// syncNotifications 同步通知表
func (s *SyncService) syncNotifications(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var notifications []models.Notification
	if err := localDB.Find(&notifications).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, n := range notifications {
		ids = append(ids, n.ID)
		query := s.buildUpsertQuery("notifications", []string{"id", "title", "content", "type", "sender_id", "is_global", "create_time", "update_time"}, dbType)
		_, err := remoteDB.Exec(query, n.ID, n.Title, n.Content, n.Type, n.SenderID, n.IsGlobal, n.CreateTime, n.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(remoteDB, "notifications", ids, dbType); err != nil {
		fmt.Printf("清理 notifications 多余数据失败: %v\n", err)
	}

	return int64(len(notifications)), ""
}

// syncUserNotifications 同步用户通知关联表
func (s *SyncService) syncUserNotifications(localDB *gorm.DB, remoteDB *sql.DB, dbType string) (int64, string) {
	var userNotifications []models.UserNotification
	if err := localDB.Find(&userNotifications).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, un := range userNotifications {
		ids = append(ids, un.ID)
		query := s.buildUpsertQuery("user_notifications", []string{"id", "user_id", "notification_id", "is_read", "read_time"}, dbType)
		_, err := remoteDB.Exec(query, un.ID, un.UserID, un.NotificationID, un.IsRead, un.ReadTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(remoteDB, "user_notifications", ids, dbType); err != nil {
		fmt.Printf("清理 user_notifications 多余数据失败: %v\n", err)
	}

	return int64(len(userNotifications)), ""
}

// buildUpsertQuery 构建 UPSERT 语句 (支持 PostgreSQL 和 MySQL)
func (s *SyncService) buildUpsertQuery(table string, columns []string, dbType string) string {
	// 构建占位符
	placeholders := ""
	updateSet := ""
	for i, col := range columns {
		if i > 0 {
			placeholders += ", "
			if col != "id" {
				if updateSet != "" {
					updateSet += ", "
				}
			}
		}
		if dbType == "postgres" {
			placeholders += fmt.Sprintf("$%d", i+1)
			if col != "id" {
				updateSet += fmt.Sprintf("%s = EXCLUDED.%s", col, col)
			}
		} else {
			placeholders += "?"
			if col != "id" {
				updateSet += fmt.Sprintf("%s = VALUES(%s)", col, col)
			}
		}
	}

	colNames := ""
	for i, col := range columns {
		if i > 0 {
			colNames += ", "
		}
		colNames += col
	}

	if dbType == "postgres" {
		return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s",
			table, colNames, placeholders, updateSet)
	}
	// MySQL
	return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s",
		table, colNames, placeholders, updateSet)
}
