package models

import "time"

// AuditLog 审计日志模型
// 记录所有敏感操作，用于安全追溯和合规审计
type AuditLog struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	UserID    int64     `gorm:"not null;index" json:"user_id"`
	Action    string    `gorm:"size:50;not null;index" json:"action"`     // login, create_project, delete_payment
	Resource  string    `gorm:"size:50" json:"resource"`                 // project, payment, user
	ResourceID int64     `gorm:"index" json:"resource_id"`                // 资源ID
	IP        string    `gorm:"size:45" json:"ip"`                       // 操作者IP
	UserAgent string    `gorm:"size:255" json:"user_agent"`              // 浏览器信息
	Details   string    `gorm:"type:text" json:"details"`                // 详细信息
	CreatedAt time.Time `gorm:"autoCreateTime;index" json:"created_at"`  // 创建时间
}