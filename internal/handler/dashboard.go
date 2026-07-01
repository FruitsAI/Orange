package handler

import (
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// DashboardHandler 仪表盘模块接口处理器
// 负责处理仪表盘页面的所有统计数据、图表数据及快捷列表的查询请求。
type DashboardHandler struct {
	dashboardService *service.DashboardService
}

// NewDashboardHandler 创建仪表盘处理器实例
func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		dashboardService: service.NewDashboardService(),
	}
}

// Stats 获取核心统计数据
// @Summary 仪表盘统计卡片数据
// @Description 获取总金额、已收、待收等核心指标，支持按周期(period)过滤
// @Tags Dashboard
// @Security Bearer
// @Param period query string false "统计周期: week, month, quarter, year, all (默认为all)"
// @Success 200 {object} dto.Stats
// @Router /api/v1/dashboard/stats [get]
func (h *DashboardHandler) Stats(c *gin.Context) {
	userID := c.GetInt64("user_id")

	period := c.Query("period") // 参数为空时，Service层默认视为全局统计
	stats, err := h.dashboardService.GetStats(userID, period)
	if err != nil {
		response.HandleServiceError(c, err, "获取统计数据失败")
		return
	}

	response.Success(c, stats)
}

// IncomeTrend 获取收入趋势图数据
// @Summary 收入趋势折线图
// @Description 获取指定周期内的收入趋势对比数据
// @Tags Dashboard
// @Security Bearer
// @Param period query string false "时间维度: week, month, quarter, year (默认month)"
// @Success 200 {object} dto.IncomeTrend
// @Router /api/v1/dashboard/income-trend [get]
func (h *DashboardHandler) IncomeTrend(c *gin.Context) {
	userID := c.GetInt64("user_id")
	period := c.DefaultQuery("period", "month")

	trend, err := h.dashboardService.GetIncomeTrend(userID, period)
	if err != nil {
		response.HandleServiceError(c, err, "获取收入趋势失败")
		return
	}

	response.Success(c, trend)
}

// RecentProjects 获取最近更新的项目
// @Summary 最近项目列表
// @Description 获取最近更新的5个项目，用于仪表盘展示
// @Tags Dashboard
// @Security Bearer
// @Success 200 {array} models.Project
// @Router /api/v1/dashboard/recent-projects [get]
func (h *DashboardHandler) RecentProjects(c *gin.Context) {
	userID := c.GetInt64("user_id")

	projects, err := h.dashboardService.GetRecentProjects(userID)
	if err != nil {
		response.HandleServiceError(c, err, "获取最近项目失败")
		return
	}

	response.Success(c, projects)
}

// UpcomingPayments 获取即将到期的款项
// @Summary 即将到期收款
// @Description 获取未来7天内即将到期的待收款项
// @Tags Dashboard
// @Security Bearer
// @Success 200 {array} models.Payment
// @Router /api/v1/dashboard/upcoming-payments [get]
func (h *DashboardHandler) UpcomingPayments(c *gin.Context) {
	userID := c.GetInt64("user_id")

	payments, err := h.dashboardService.GetUpcomingPayments(userID)
	if err != nil {
		response.HandleServiceError(c, err, "获取即将到期收款失败")
		return
	}

	response.Success(c, payments)
}
