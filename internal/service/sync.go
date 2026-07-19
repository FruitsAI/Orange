package service

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/jackc/pgx/v5/stdlib"
	"gorm.io/gorm"
)

// 允许同步的固定表结构白名单
var syncTableColumns = map[string][]string{
	"users":                  {"id", "username", "password", "name", "email", "phone", "avatar", "role", "department", "position", "status", "create_time", "update_time"},
	"projects":               {"id", "name", "company", "total_amount", "received_amount", "status", "type", "contract_number", "contract_date", "payment_method", "start_date", "end_date", "description", "user_id", "create_time", "update_time"},
	"payments":               {"id", "project_id", "stage", "amount", "percentage", "plan_date", "status", "actual_date", "method", "remark", "user_id", "create_time", "update_time"},
	"dictionaries":           {"id", "code", "name", "status", "remark", "create_time", "update_time"},
	"dictionary_item":        {"id", "dictionary_id", "label", "value", "sort", "status", "remark", "create_time", "update_time"},
	"notifications":          {"id", "title", "content", "type", "sender_id", "is_global", "create_time", "update_time"},
	"user_notifications":     {"id", "user_id", "notification_id", "is_read", "read_time"},
	"personal_access_tokens": {"id", "user_id", "name", "token_hash", "scopes", "status", "last_used_at", "expires_at", "create_time", "update_time"},
}

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

type syncExecutor interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
}

const syncOperationTimeout = 60 * time.Second

// NewSyncService 创建同步服务实例
func NewSyncService() *SyncService {
	return &SyncService{}
}

// validateTableName 验证表名是否在白名单中
func (s *SyncService) validateTableName(table string) error {
	if _, ok := syncTableColumns[table]; !ok {
		return fmt.Errorf("invalid table name: %s", table)
	}
	return nil
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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
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
	ctx, cancel := context.WithTimeout(context.Background(), syncOperationTimeout)
	defer cancel()
	if err := remoteDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("连接云端数据库失败: %w", err)
	}

	// 获取本地数据库
	localDB := database.GetDB()

	// 要对比的表
	tables := []string{"users", "projects", "payments", "dictionaries", "dictionary_item", "notifications", "user_notifications", "personal_access_tokens"}
	results := make([]TableCompareResult, 0, len(tables))

	for _, table := range tables {
		// 验证表名白名单
		if err := s.validateTableName(table); err != nil {
			continue // 跳过非法表名
		}

		result := TableCompareResult{TableName: table}

		// 本地计数
		var localCount int64
		localDB.Table(table).Count(&localCount)
		result.LocalCount = localCount

		quotedTable, err := s.quoteSyncIdentifier(table, cfg.DBType)
		if err != nil {
			continue
		}

		// 云端计数 (表可能不存在)
		var remoteCount int64
		row := remoteDB.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", quotedTable))
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

	ctx, cancel := context.WithTimeout(context.Background(), syncOperationTimeout)
	defer cancel()
	if err := remoteDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("云端数据库连接失败: %w", err)
	}

	localDB := database.GetDB()
	results := make([]SyncResult, 0, len(tables))

	tx, err := remoteDB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("开启云端事务失败: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				// 记录回滚失败，但不影响主错误返回
				log.Printf("事务回滚失败: %v", rollbackErr)
			}
		}
	}()

	failed := false
	for _, table := range tables {
		if err := s.validateTableName(table); err != nil {
			results = append(results, SyncResult{
				TableName:    table,
				Success:      false,
				ErrorMessage: err.Error(),
			})
			failed = true
			break
		}

		result := SyncResult{TableName: table, Success: true}

		switch table {
		case "users":
			result.SyncedCount, result.ErrorMessage = s.syncUsers(ctx, localDB, tx, cfg.DBType)
		case "projects":
			result.SyncedCount, result.ErrorMessage = s.syncProjects(ctx, localDB, tx, cfg.DBType)
		case "payments":
			result.SyncedCount, result.ErrorMessage = s.syncPayments(ctx, localDB, tx, cfg.DBType)
		case "dictionaries":
			result.SyncedCount, result.ErrorMessage = s.syncDictionaries(ctx, localDB, tx, cfg.DBType)
		case "dictionary_item":
			result.SyncedCount, result.ErrorMessage = s.syncDictionaryItems(ctx, localDB, tx, cfg.DBType)
		case "notifications":
			result.SyncedCount, result.ErrorMessage = s.syncNotifications(ctx, localDB, tx, cfg.DBType)
		case "user_notifications":
			result.SyncedCount, result.ErrorMessage = s.syncUserNotifications(ctx, localDB, tx, cfg.DBType)
		case "personal_access_tokens":
			result.SyncedCount, result.ErrorMessage = s.syncPersonalAccessTokens(ctx, localDB, tx, cfg.DBType)
		}

		if result.ErrorMessage != "" {
			result.Success = false
			failed = true
		}
		results = append(results, result)
		if failed {
			break
		}
	}

	if failed {
		return results, nil
	}
	if err := tx.Commit(); err != nil {
		return results, fmt.Errorf("提交云端事务失败: %w", err)
	}
	committed = true

	return results, nil
}

// deleteExtras 删除云端多余的数据
func (s *SyncService) deleteExtras(ctx context.Context, remoteDB syncExecutor, table string, keepIDs []interface{}, dbType string) error {
	quotedTable, err := s.quoteSyncIdentifier(table, dbType)
	if err != nil {
		return err
	}

	if len(keepIDs) == 0 {
		return fmt.Errorf("refuse to delete all rows from %s because local ID list is empty", table)
	}

	query := fmt.Sprintf("DELETE FROM %s WHERE %s NOT IN (", quotedTable, s.quoteColumn("id", dbType)) // #nosec G201 -- table name is validated against syncTableColumns before quoting.
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

	_, err = remoteDB.ExecContext(ctx, query, args...)
	return err
}

// syncUsers 同步用户表
func (s *SyncService) syncUsers(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var users []models.User
	if err := localDB.Find(&users).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, u := range users {
		ids = append(ids, u.ID)
		query, err := s.buildUpsertQuery("users", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, u.ID, u.Username, u.Password, u.Name, u.Email, u.Phone, u.Avatar, u.Role, u.Department, u.Position, u.Status, u.CreateTime, u.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	// 删除多余数据
	if err := s.deleteExtras(ctx, remoteDB, "users", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 users 多余数据失败: %v", err)
	}

	return int64(len(users)), ""
}

// syncProjects 同步项目表
func (s *SyncService) syncProjects(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var projects []models.Project
	if err := localDB.Find(&projects).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, p := range projects {
		ids = append(ids, p.ID)
		query, err := s.buildUpsertQuery("projects", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, p.ID, p.Name, p.Company, p.TotalAmount, p.ReceivedAmount, p.Status, p.Type, p.ContractNumber, p.ContractDate, p.PaymentMethod, p.StartDate, p.EndDate, p.Description, p.UserID, p.CreateTime, p.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "projects", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 projects 多余数据失败: %v", err)
	}

	return int64(len(projects)), ""
}

// syncPayments 同步收款表
func (s *SyncService) syncPayments(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var payments []models.Payment
	if err := localDB.Find(&payments).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, p := range payments {
		ids = append(ids, p.ID)
		query, err := s.buildUpsertQuery("payments", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, p.ID, p.ProjectID, p.Stage, p.Amount, p.Percentage, p.PlanDate, p.Status, p.ActualDate, p.Method, p.Remark, p.UserID, p.CreateTime, p.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "payments", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 payments 多余数据失败: %v", err)
	}

	return int64(len(payments)), ""
}

// syncDictionaries 同步字典表
func (s *SyncService) syncDictionaries(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var dicts []models.Dictionary
	if err := localDB.Find(&dicts).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, d := range dicts {
		ids = append(ids, d.ID)
		query, err := s.buildUpsertQuery("dictionaries", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, d.ID, d.Code, d.Name, d.Status, d.Remark, d.CreateTime, d.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "dictionaries", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 dictionaries 多余数据失败: %v", err)
	}

	return int64(len(dicts)), ""
}

// syncDictionaryItems 同步字典项表
func (s *SyncService) syncDictionaryItems(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var items []models.DictionaryItem
	if err := localDB.Find(&items).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, item := range items {
		ids = append(ids, item.ID)
		query, err := s.buildUpsertQuery("dictionary_item", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, item.ID, item.DictionaryID, item.Label, item.Value, item.Sort, item.Status, item.Remark, item.CreateTime, item.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "dictionary_item", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 dictionary_item 多余数据失败: %v", err)
	}

	return int64(len(items)), ""
}

// syncNotifications 同步通知表
func (s *SyncService) syncNotifications(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var notifications []models.Notification
	if err := localDB.Find(&notifications).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, n := range notifications {
		ids = append(ids, n.ID)
		query, err := s.buildUpsertQuery("notifications", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, n.ID, n.Title, n.Content, n.Type, n.SenderID, n.IsGlobal, n.CreateTime, n.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "notifications", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 notifications 多余数据失败: %v", err)
	}

	return int64(len(notifications)), ""
}

// syncUserNotifications 同步用户通知关联表
func (s *SyncService) syncUserNotifications(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var userNotifications []models.UserNotification
	if err := localDB.Find(&userNotifications).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, un := range userNotifications {
		ids = append(ids, un.ID)
		query, err := s.buildUpsertQuery("user_notifications", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, un.ID, un.UserID, un.NotificationID, un.IsRead, un.ReadTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "user_notifications", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 user_notifications 多余数据失败: %v", err)
	}

	return int64(len(userNotifications)), ""
}

// syncPersonalAccessTokens 同步个人访问令牌表
func (s *SyncService) syncPersonalAccessTokens(ctx context.Context, localDB *gorm.DB, remoteDB syncExecutor, dbType string) (int64, string) {
	var tokens []models.PersonalAccessToken
	if err := localDB.Find(&tokens).Error; err != nil {
		return 0, fmt.Sprintf("读取本地数据失败: %v", err)
	}

	var ids []interface{}
	for _, t := range tokens {
		ids = append(ids, t.ID)
		query, err := s.buildUpsertQuery("personal_access_tokens", dbType)
		if err != nil {
			return 0, err.Error()
		}
		_, err = remoteDB.ExecContext(ctx, query, t.ID, t.UserID, t.Name, t.TokenHash, t.Scopes, t.Status, t.LastUsedAt, t.ExpiresAt, t.CreateTime, t.UpdateTime)
		if err != nil {
			return 0, fmt.Sprintf("同步失败: %v", err)
		}
	}

	if err := s.deleteExtras(ctx, remoteDB, "personal_access_tokens", ids, dbType); err != nil {
		return 0, fmt.Sprintf("清理 personal_access_tokens 多余数据失败: %v", err)
	}

	return int64(len(tokens)), ""
}

// buildUpsertQuery 构建 UPSERT 语句 (支持 PostgreSQL 和 MySQL)
func (s *SyncService) buildUpsertQuery(table string, dbType string) (string, error) {
	columns, ok := syncTableColumns[table]
	if !ok {
		return "", fmt.Errorf("invalid table name: %s", table)
	}

	quotedTable := s.quoteColumn(table, dbType)
	quotedColumns := make([]string, 0, len(columns))
	placeholders := make([]string, 0, len(columns))
	updateSet := make([]string, 0, len(columns)-1)

	for i, col := range columns {
		quotedCol := s.quoteColumn(col, dbType)
		quotedColumns = append(quotedColumns, quotedCol)

		if dbType == "postgres" {
			placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
			if col != "id" {
				updateSet = append(updateSet, fmt.Sprintf("%s = EXCLUDED.%s", quotedCol, quotedCol))
			}
			continue
		}

		placeholders = append(placeholders, "?")
		if col != "id" {
			updateSet = append(updateSet, fmt.Sprintf("%s = VALUES(%s)", quotedCol, quotedCol))
		}
	}

	if dbType == "postgres" {
		return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET %s",
			quotedTable,
			strings.Join(quotedColumns, ", "),
			strings.Join(placeholders, ", "),
			s.quoteColumn("id", dbType),
			strings.Join(updateSet, ", ")), nil
	}

	return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s",
		quotedTable,
		strings.Join(quotedColumns, ", "),
		strings.Join(placeholders, ", "),
		strings.Join(updateSet, ", ")), nil
}

func (s *SyncService) quoteSyncIdentifier(identifier string, dbType string) (string, error) {
	if err := s.validateTableName(identifier); err != nil {
		return "", err
	}
	return s.quoteColumn(identifier, dbType), nil
}

func (s *SyncService) quoteColumn(identifier string, dbType string) string {
	if dbType == "postgres" {
		return `"` + identifier + `"`
	}
	return "`" + identifier + "`"
}
