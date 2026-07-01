package handler

import (
	"strconv"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// PaymentHandler 款项管理模块接口处理器
// 负责处理与款项（收款/付款）相关的 HTTP 请求，包括列表查询、创建、更新、删除及确认收款。
type PaymentHandler struct {
	paymentService *service.PaymentService
}

// NewPaymentHandler 创建款项处理器实例
func NewPaymentHandler() *PaymentHandler {
	return &PaymentHandler{
		paymentService: service.NewPaymentService(),
	}
}

// GetByProject 获取指定项目的款项列表
// @Summary 项目款项列表
// @Description 根据项目ID获取该项目下的所有款项记录
// @Tags Payment
// @Security Bearer
// @Param id path int true "项目ID"
// @Success 200 {array} models.Payment
// @Router /api/v1/projects/{id}/payments [get]
func (h *PaymentHandler) GetByProject(c *gin.Context) {
	userID := c.GetInt64("user_id")
	projectID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的项目ID")
		return
	}

	payments, err := h.paymentService.ListByProjectForUser(userID, projectID)
	if err != nil {
		response.InternalError(c, "获取收款列表失败")
		return
	}

	response.Success(c, payments)
}

// List 综合查询款项列表
// @Summary 查询款项列表
// @Description 根据日期范围或项目ID筛选款项记录
// @Tags Payment
// @Security Bearer
// @Param start_date query string false "开始日期 (YYYY-MM-DD)"
// @Param end_date query string false "结束日期 (YYYY-MM-DD)"
// @Param project_id query int false "项目ID (可选，若提供则忽略日期范围)"
// @Success 200 {array} models.Payment
// @Router /api/v1/payments [get]
func (h *PaymentHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// 1. 按日期范围查询
	if startDate != "" && endDate != "" {
		payments, err := h.paymentService.ListByDateRange(userID, startDate, endDate)
		if err != nil {
			response.InternalError(c, "获取收款列表失败")
			return
		}
		response.Success(c, payments)
		return
	}

	// 2. 按项目ID查询 (冗余入口，建议统一使用 GetByProject)
	projectIDStr := c.Query("project_id")
	if projectIDStr != "" {
		projectID, err := strconv.ParseInt(projectIDStr, 10, 64)
		if err != nil {
			response.ParamError(c, "无效的项目ID")
			return
		}
		payments, err := h.paymentService.ListByProjectForUser(userID, projectID)
		if err != nil {
			response.InternalError(c, "获取收款列表失败")
			return
		}
		response.Success(c, payments)
		return
	}

	// 如果没有指定项目或日期，返回空列表
	response.Success(c, []interface{}{})
}

// Create 创建新款项
// @Summary 创建款项
// @Description 录入新的款项记录(收款计划)
// @Tags Payment
// @Security Bearer
// @Param payment body dto.PaymentRequest true "款项信息"
// @Success 200 {object} models.Payment
// @Router /api/v1/payments [post]
func (h *PaymentHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req dto.PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	req.UserID = userID // 手动设置 UserID，确保数据归属正确

	payment, err := h.paymentService.Create(req)
	if err != nil {
		response.InternalError(c, "创建收款失败")
		return
	}

	response.Success(c, payment)
}

// Update 更新款项信息
// @Summary 更新款项
// @Description 修改现有款项的金额、日期、阶段等信息
// @Tags Payment
// @Security Bearer
// @Param id path int true "款项ID"
// @Param payment body dto.PaymentRequest true "更新内容"
// @Success 200 {object} models.Payment
// @Router /api/v1/payments/{id} [put]
func (h *PaymentHandler) Update(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的收款ID")
		return
	}

	var req dto.PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	payment, err := h.paymentService.UpdateForUser(userID, id, req)
	if err != nil {
		response.InternalError(c, "更新收款失败")
		return
	}

	response.Success(c, payment)
}

// Delete 删除款项
// @Summary 删除款项
// @Description 永久删除指定的款项记录
// @Tags Payment
// @Security Bearer
// @Param id path int true "款项ID"
// @Success 200 {string} string "删除成功"
// @Router /api/v1/payments/{id} [delete]
func (h *PaymentHandler) Delete(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的收款ID")
		return
	}

	if err := h.paymentService.DeleteForUser(userID, id); err != nil {
		response.InternalError(c, "删除收款失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

// Confirm 确认收款到位
// @Summary 确认收款
// @Description 将款项状态流转为"已收款"，并记录实际收款日期和方式
// @Tags Payment
// @Security Bearer
// @Param id path int true "款项ID"
// @Param confirm body dto.ConfirmPaymentRequest true "确认信息"
// @Success 200 {string} string "确认成功"
// @Router /api/v1/payments/{id}/confirm [post]
func (h *PaymentHandler) Confirm(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的收款ID")
		return
	}

	var req dto.ConfirmPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	if err := h.paymentService.ConfirmForUser(userID, id, req.ActualDate, req.Method); err != nil {
		response.InternalError(c, "确认收款失败")
		return
	}

	response.SuccessWithMessage(c, "确认成功", nil)
}
