package service

import (
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
)

// AuditService 审计日志服务
// 负责记录和查询系统中的敏感操作日志
type AuditService struct{}

// NewAuditService 创建审计服务实例
func NewAuditService() *AuditService {
	return &AuditService{}
}

// Record 记录审计日志
//
// 参数:
//   - userID: 操作用户ID
//   - action: 操作类型（如 login, create_project）
//   - resource: 资源类型（如 project, payment）
//   - resourceID: 资源ID
//   - ip: 操作者IP地址
//   - userAgent: 浏览器信息
//   - details: 详细描述
//
// 返回:
//   - error: 记录失败
func (s *AuditService) Record(userID int64, action, resource string, resourceID int64, ip, userAgent, details string) error {
	log := &models.AuditLog{
		UserID:     userID,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		IP:         ip,
		UserAgent:  userAgent,
		Details:    details,
	}
	return database.GetDB().Create(log).Error
}

// List 查询审计日志列表（管理员）
//
// 参数:
//   - userID: 筛选用户ID（可选）
//   - action: 筛选操作类型（可选）
//   - page: 页码
//   - pageSize: 每页数量
//
// 返回:
//   - []models.AuditLog: 日志列表
//   - int64: 总数
//   - error: 查询失败
func (s *AuditService) List(userID int64, action string, page, pageSize int) ([]models.AuditLog, int64, error) {
	db := database.GetDB().Model(&models.AuditLog{})

	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	}
	if action != "" {
		db = db.Where("action = ?", action)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var logs []models.AuditLog
	offset := (page - 1) * pageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}