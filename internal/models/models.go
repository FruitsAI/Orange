package models

import (
	"time"
)

// User 用户模型
// 对应可能是系统管理员或普通员工。
// 包含用户的基本信息、登录凭证（密码Hash）以及角色权限信息。
type User struct {
	ID            int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	Username      string     `json:"username" gorm:"size:50;not null;uniqueIndex"` // 用户名，唯一
	Password      string     `json:"-" gorm:"size:100;not null"`                   // 密码 Hash 值，JSON 序列化时忽略
	Name          string     `json:"name" gorm:"size:50;not null"`                 // 真实姓名
	Email         string     `json:"email" gorm:"size:100"`                        // 邮箱
	Phone         string     `json:"phone" gorm:"size:20"`                         // 手机号
	Avatar        string     `json:"avatar" gorm:"size:255"`                       // 头像 URL
	Role          string     `json:"role" gorm:"size:20;not null;default:'user'"`  // 角色: admin, user
	Department    string     `json:"department" gorm:"size:50"`                    // 部门
	Position      string     `json:"position" gorm:"size:50"`                      // 职位
	Status        int        `json:"status" gorm:"default:1"`                      // 状态: 1=正常, 0=禁用
	LastLoginTime *time.Time `json:"last_login_time"`                              // 最后登录时间
	CreateTime    time.Time  `json:"create_time" gorm:"autoCreateTime"`            // 创建时间
	UpdateTime    time.Time  `json:"update_time" gorm:"autoUpdateTime"`            // 更新时间
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

// Project 项目模型
// 核心业务对象，记录项目基本信息、合同详情及财务汇总。
type Project struct {
	ID             int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	Name           string     `json:"name" gorm:"size:100;not null"`                                           // 项目名称
	Company        string     `json:"company" gorm:"size:100;not null"`                                        // 建设单位/客户
	TotalAmount    float64    `json:"total_amount" gorm:"type:real;not null"`                                  // 合同总金额
	ReceivedAmount float64    `json:"received_amount" gorm:"type:real;default:0"`                              // 已回款金额
	Status         string     `json:"status" gorm:"size:20;not null"`                                          // 状态: pending, processing, completed, archived
	Type           string     `json:"type" gorm:"size:50;not null"`                                            // 项目类型 (字典项)
	ContractNumber string     `json:"contract_number" gorm:"size:50;uniqueIndex:idx_user_contract,priority:2"` // 合同编号
	ContractDate   *time.Time `json:"contract_date" gorm:"type:date"`                                          // 签订日期
	PaymentMethod  string     `json:"payment_method" gorm:"size:30"`                                           // 支付方式 (字典项)
	StartDate      time.Time  `json:"start_date" gorm:"type:date;not null"`                                    // 计划开始日期
	EndDate        time.Time  `json:"end_date" gorm:"type:date;not null"`                                      // 计划结束日期
	Description    string     `json:"description"`                                                             // 项目描述
	UserID         int64      `json:"user_id" gorm:"not null;index;uniqueIndex:idx_user_contract,priority:1"`  // 负责人ID
	CreateTime     time.Time  `json:"create_time" gorm:"autoCreateTime"`                                       // 创建时间
	UpdateTime     time.Time  `json:"update_time" gorm:"autoUpdateTime"`                                       // 更新时间

	// 关联
	User     *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`        // 关联负责人
	Payments []Payment `json:"payments,omitempty" gorm:"foreignKey:ProjectID"` // 关联款项列表
}

// TableName 指定表名
func (Project) TableName() string {
	return "projects"
}

// Payment 款项模型
// 记录项目分期付款的计划与实际执行情况。
type Payment struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	ProjectID  int64      `json:"project_id" gorm:"not null;index"`                                // 关联项目ID
	Stage      string     `json:"stage" gorm:"size:50;not null"`                                   // 款项阶段 (如: 首付款, 进度款, 尾款)
	Amount     float64    `json:"amount" gorm:"type:real;not null"`                                // 金额
	Percentage float64    `json:"percentage" gorm:"type:real"`                                     // 占总金额百分比
	PlanDate   time.Time  `json:"plan_date" gorm:"type:date;not null;index"`                       // 计划收款日期
	Status     string     `json:"status" gorm:"size:20;not null;index:idx_user_status,priority:2"` // 状态: uncollected, collected
	ActualDate *time.Time `json:"actual_date" gorm:"type:date;index"`                              // 实际收款日期
	Method     string     `json:"method" gorm:"size:30"`                                           // 收款方式 (如: 银行转账)
	Remark     string     `json:"remark" gorm:"size:255"`                                          // 备注
	UserID     int64      `json:"user_id" gorm:"not null;index:idx_user_status,priority:1"`        // 经办人ID (通常为创建者或当前负责人)
	CreateTime time.Time  `json:"create_time" gorm:"autoCreateTime"`                               // 创建时间
	UpdateTime time.Time  `json:"update_time" gorm:"autoUpdateTime"`                               // 更新时间

	// 关联
	Project *Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"` // 关联项目
}

// TableName 指定表名
func (Payment) TableName() string {
	return "payments"
}

// Dictionary 字典主表 (分类)
// 用于管理系统中的枚举值配置，如项目类型、支付方式等。
type Dictionary struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Code       string    `json:"code" gorm:"size:50;not null;uniqueIndex"` // 字典编码 (英文唯一，前端使用)
	Name       string    `json:"name" gorm:"size:50;not null"`             // 字典名称
	Status     int       `json:"status" gorm:"default:1"`                  // 状态: 1=启用, 0=禁用
	Remark     string    `json:"remark" gorm:"size:255"`                   // 备注
	CreateTime time.Time `json:"create_time" gorm:"autoCreateTime"`        // 创建时间
	UpdateTime time.Time `json:"update_time" gorm:"autoUpdateTime"`        // 更新时间

	// 关联
	Items []DictionaryItem `json:"items,omitempty" gorm:"foreignKey:DictionaryID"` // 包含的字典项列表
}

// TableName 指定表名
func (Dictionary) TableName() string {
	return "dictionaries"
}

// DictionaryItem 字典项 (明细)
// 具体的枚举值定义。
type DictionaryItem struct {
	ID           int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	DictionaryID int64     `json:"dictionary_id" gorm:"not null;index"` // 归属字典ID
	Label        string    `json:"label" gorm:"size:50;not null"`       // 显示文本
	Value        string    `json:"value" gorm:"size:50;not null"`       // 实际值
	Sort         int       `json:"sort" gorm:"default:0"`               // 排序字段
	Status       int       `json:"status" gorm:"default:1"`             // 状态: 1=启用
	Remark       string    `json:"remark" gorm:"size:255"`              // 备注
	CreateTime   time.Time `json:"create_time" gorm:"autoCreateTime"`
	UpdateTime   time.Time `json:"update_time" gorm:"autoUpdateTime"`
}

// TableName 指定表名
func (DictionaryItem) TableName() string {
	return "dictionary_item"
}

// Notification 通知模型
// 涵盖系统通知、活动公告及私信。
type Notification struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Title      string    `json:"title" gorm:"size:100;not null"`    // 标题
	Content    string    `json:"content" gorm:"not null"`           // 内容
	Type       int       `json:"type" gorm:"default:1"`             // 类型: 1:系统通知, 2:活动通知, 3:私信
	SenderID   int64     `json:"sender_id" gorm:"not null;index"`   // 发送者ID
	IsGlobal   int       `json:"is_global" gorm:"default:0"`        // 是否为全局广播: 0=否, 1=是
	CreateTime time.Time `json:"create_time" gorm:"autoCreateTime"` // 创建时间
	UpdateTime time.Time `json:"update_time" gorm:"autoUpdateTime"` // 更新时间

	// 非数据库字段，用于前端展示
	IsRead bool  `json:"is_read" gorm:"->"`                           // 当前用户是否已读
	Sender *User `json:"sender,omitempty" gorm:"foreignKey:SenderID"` // 发送者详情
}

// TableName 指定表名
func (Notification) TableName() string {
	return "notifications"
}

// UserNotification 用户-通知关联表
// 记录用户对通知的阅读状态。对于非全局通知，此表也充当收件箱关系表。
type UserNotification struct {
	ID             int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID         int64      `json:"user_id" gorm:"not null;uniqueIndex:idx_user_notification"`
	NotificationID int64      `json:"notification_id" gorm:"not null;uniqueIndex:idx_user_notification"`
	IsRead         int        `json:"is_read" gorm:"default:0"` // 阅读状态: 0:未读, 1:已读
	ReadTime       *time.Time `json:"read_time"`                // 阅读时间
}

// TableName 指定表名
func (UserNotification) TableName() string {
	return "user_notifications"
}

// PersonalAccessToken 个人访问令牌
// 用于开发者或者第三方应用访问 API。
// Token 只在创建时返回一次，数据库只存储 Hash 值。
type PersonalAccessToken struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64      `json:"user_id" gorm:"not null;index"`     // 关联用户ID
	Name       string     `json:"name" gorm:"size:50;not null"`      // 令牌名称 (用途描述)
	TokenHash  string     `json:"-" gorm:"size:100;not null;index"`  // 令牌 Hash (SHA256)
	Scopes     string     `json:"scopes" gorm:"size:255;default:''"` // 权限范围 (暂留，逗号分隔)
	Status     int        `json:"status" gorm:"default:1"`           // 状态: 1=正常, 0=撤销
	LastUsedAt *time.Time `json:"last_used_at"`                      // 最后使用时间
	ExpiresAt  *time.Time `json:"expires_at"`                        // 过期时间 (Null 表示永不过期)
	CreateTime time.Time  `json:"create_time" gorm:"autoCreateTime"` // 创建时间
	UpdateTime time.Time  `json:"update_time" gorm:"autoUpdateTime"` // 更新时间

	// 关联
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (PersonalAccessToken) TableName() string {
	return "personal_access_tokens"
}
