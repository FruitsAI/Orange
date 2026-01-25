package handler

import (
	"net/http"
	"os"
	"strconv"

	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// SyncHandler 数据同步 HTTP Handler
type SyncHandler struct {
	syncService *service.SyncService
}

// GetConfig 获取同步配置 (从环境变量)
// @Router /api/v1/sync/config [get]
func (h *SyncHandler) GetConfig(c *gin.Context) {
	port, _ := strconv.Atoi(os.Getenv("SYNC_DB_PORT"))
	if port == 0 {
		port = 5432
	}

	config := gin.H{
		"db_type":  os.Getenv("SYNC_DB_TYPE"),
		"host":     os.Getenv("SYNC_DB_HOST"),
		"port":     port,
		"user":     os.Getenv("SYNC_DB_USER"),
		"password": os.Getenv("SYNC_DB_PASSWORD"),
		"db_name":  os.Getenv("SYNC_DB_NAME"),
		"ssl_mode": os.Getenv("SYNC_SSL_MODE"),
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": config})
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
	Password string `json:"password" binding:"required"`
	DBName   string `json:"db_name" binding:"required"`
	SSLMode  string `json:"ssl_mode"`
}

// TestConnection 测试云端数据库连接
// @Router /api/v1/sync/test-connection [post]
func (h *SyncHandler) TestConnection(c *gin.Context) {
	var req TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "message": "参数错误: " + err.Error()})
		return
	}

	cfg := service.SyncConfig{
		DBType:   req.DBType,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	if err := h.syncService.TestConnection(cfg); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 1, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "连接成功"})
}

// Compare 对比本地与云端表的记录数
// @Router /api/v1/sync/compare [post]
func (h *SyncHandler) Compare(c *gin.Context) {
	var req TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "message": "参数错误: " + err.Error()})
		return
	}

	cfg := service.SyncConfig{
		DBType:   req.DBType,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	results, err := h.syncService.CompareData(cfg)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 1, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": results})
}

// ExecuteRequest 执行同步请求
type ExecuteRequest struct {
	DBType   string   `json:"db_type" binding:"required"`
	Host     string   `json:"host" binding:"required"`
	Port     int      `json:"port" binding:"required"`
	User     string   `json:"user" binding:"required"`
	Password string   `json:"password" binding:"required"`
	DBName   string   `json:"db_name" binding:"required"`
	SSLMode  string   `json:"ssl_mode"`
	Tables   []string `json:"tables" binding:"required"` // 要同步的表列表
}

// Execute 执行数据同步
// @Router /api/v1/sync/execute [post]
func (h *SyncHandler) Execute(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "message": "参数错误: " + err.Error()})
		return
	}

	cfg := service.SyncConfig{
		DBType:   req.DBType,
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	results, err := h.syncService.SyncTables(cfg, req.Tables)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"code": 1, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": results, "message": "同步完成"})
}
