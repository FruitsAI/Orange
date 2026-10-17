package handler

import (
	"log/slog"
	"os"
	"strconv"

	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// SyncHandler 数据同步 HTTP Handler
// 权限: 所有 /sync 路由已在 router 层通过 middleware.AdminOnly() 限制为管理员。
type SyncHandler struct {
	syncService *service.SyncService
}

// GetConfig 获取同步配置 (从环境变量)
// @Router /api/v1/sync/config [get]
func (h *SyncHandler) GetConfig(c *gin.Context) {
	port, err := strconv.Atoi(os.Getenv("SYNC_DB_PORT"))
	if err != nil || port == 0 {
		port = 5432
	}

	// 安全考虑：不返回密码字段，避免敏感信息泄露
	// 前端应单独输入密码，而非从服务器读取
	config := gin.H{
		"db_type": os.Getenv("SYNC_DB_TYPE"),
		"host":    os.Getenv("SYNC_DB_HOST"),
		"port":    port,
		"user":    os.Getenv("SYNC_DB_USER"),
		// "password": os.Getenv("SYNC_DB_PASSWORD"), // 已移除：不返回密码
		"db_name":  os.Getenv("SYNC_DB_NAME"),
		"ssl_mode": os.Getenv("SYNC_SSL_MODE"),
	}
	response.Success(c, config)
}

// NewSyncHandler 创建同步 Handler 实例
func NewSyncHandler() *SyncHandler {
	return &SyncHandler{
		syncService: service.NewSyncService(),
	}
}

// TestConnectionRequest 测试连接请求
type TestConnectionRequest struct {
	DBType   string `json:"db_type" binding:"required"`
	Host     string `json:"host" binding:"required"`
	Port     int    `json:"port" binding:"required"`
	User     string `json:"user" binding:"required"`
	Password string `json:"password"`
	DBName   string `json:"db_name" binding:"required"`
	SSLMode  string `json:"ssl_mode"`
}

func resolveSyncPassword(password string) string {
	if password != "" {
		return password
	}
	return os.Getenv("SYNC_DB_PASSWORD")
}

// TestConnection 测试云端数据库连接
// @Router /api/v1/sync/test-connection [post]
func (h *SyncHandler) TestConnection(c *gin.Context) {
	var req TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}

	cfg := service.SyncConfig{
		DBType:   req.DBType,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: resolveSyncPassword(req.Password),
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	if err := h.syncService.TestConnection(cfg); err != nil {
		slog.Error("Sync connection test failed", "error", err)
		response.Error(c, 1, "连接失败，请检查配置")
		return
	}

	response.SuccessWithMessage(c, "连接成功", nil)
}

// Compare 对比本地与云端表的记录数
// @Router /api/v1/sync/compare [post]
func (h *SyncHandler) Compare(c *gin.Context) {
	var req TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}

	cfg := service.SyncConfig{
		DBType:   req.DBType,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: resolveSyncPassword(req.Password),
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	results, err := h.syncService.CompareData(cfg)
	if err != nil {
		// 详细错误仅记录日志，避免向客户端泄露远端数据库驱动/主机信息
		slog.Error("Sync data comparison failed", "error", err)
		response.Error(c, 1, "数据对比失败，请检查连接配置")
		return
	}

	response.Success(c, results)
}

// ExecuteRequest 执行同步请求
type ExecuteRequest struct {
	DBType   string   `json:"db_type" binding:"required"`
	Host     string   `json:"host" binding:"required"`
	Port     int      `json:"port" binding:"required"`
	User     string   `json:"user" binding:"required"`
	Password string   `json:"password"`
	DBName   string   `json:"db_name" binding:"required"`
	SSLMode  string   `json:"ssl_mode"`
	Tables   []string `json:"tables" binding:"required"` // 要同步的表列表
}

// Execute 执行数据同步
// @Router /api/v1/sync/execute [post]
func (h *SyncHandler) Execute(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}

	cfg := service.SyncConfig{
		DBType:   req.DBType,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: resolveSyncPassword(req.Password),
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	results, err := h.syncService.SyncTables(cfg, req.Tables)
	if err != nil {
		// 详细错误仅记录日志，避免向客户端泄露远端数据库驱动/主机信息
		slog.Error("Sync execution failed", "error", err)
		response.Error(c, 1, "数据同步失败，请检查连接配置")
		return
	}

	response.SuccessWithMessage(c, "同步完成", results)
}
