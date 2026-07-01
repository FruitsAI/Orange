package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/gin-gonic/gin"
)

// SystemHandler 系统级功能处理器
// 负责处理如版本检查、系统状态检测等全局性请求。
type SystemHandler struct{}

var updateHTTPClient = &http.Client{
	Timeout: 10 * time.Second,
}

// NewSystemHandler 创建系统处理器实例
func NewSystemHandler() *SystemHandler {
	return &SystemHandler{}
}

// CheckUpdateResponse 版本检查响应结构
type CheckUpdateResponse struct {
	TagName string `json:"tag_name"` // 版本标签 (如 v1.0.1)
	HtmlUrl string `json:"html_url"` // 发布页面链接
	Body    string `json:"body"`     // 更新日志内容
}

// CheckUpdate 检查是否有新版本
// @Summary 检查更新
// @Description 从 GitHub 获取最新 Release 信息
// @Tags System
// @Success 200 {object} CheckUpdateResponse
// @Router /api/v1/system/check-update [get]
func (h *SystemHandler) CheckUpdate(c *gin.Context) {
	repo := config.AppConfig.GitHubRepo
	if repo == "" {
		repo = "FruitsAI/Orange" // Fallback
	}
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repo)

	resp, err := updateHTTPClient.Get(url)
	if err != nil {
		response.InternalError(c, "Failed to fetch update info")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		response.InternalError(c, "Failed to fetch update info from GitHub")
		return
	}

	var releaseInfo CheckUpdateResponse
	if err := json.NewDecoder(resp.Body).Decode(&releaseInfo); err != nil {
		response.InternalError(c, "Failed to parse GitHub response")
		return
	}

	response.Success(c, releaseInfo)
}
