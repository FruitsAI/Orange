package constants

// 分页相关常量
const (
	DefaultPageSize = 10  // 默认每页数量
	MaxPageSize     = 100 // 最大每页数量
)

// 批量操作相关常量
const (
	BatchInsertSize = 100 // 批量插入大小
)

// 速率限制相关常量
const (
	LoginRateLimit     = 10  // 登录速率限制（每分钟次数）
	LoginRateWindow    = 60  // 登录速率窗口（秒）
	LoginBlockDuration = 300 // 登录封禁时长（秒）
)

// 安全相关常量
const (
	TokenExpiryHours = 24 // Token 过期时间（小时）
)

// 角色常量
const (
	RoleAdmin = "admin" // 管理员角色
	RoleUser  = "user"  // 普通用户角色
)

// 款项状态常量
const (
	PaymentStatusPending   = "pending"   // 待收款
	PaymentStatusConfirmed = "confirmed" // 已确认
	PaymentStatusOverdue   = "overdue"   // 已逾期
)

// 项目状态常量
const (
	ProjectStatusPlanning  = "planning"  // 规划中
	ProjectStatusOngoing   = "ongoing"   // 进行中
	ProjectStatusCompleted = "completed" // 已完成
	ProjectStatusPaused    = "paused"    // 已暂停
)

// AppVersion is the application release version.
const AppVersion = "0.7.2"
