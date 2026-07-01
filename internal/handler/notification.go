package handler

import (
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// NotificationHandler 通知消息模块处理器
// 负责处理通知的创建、查询、状态更新及删除等操作。
type NotificationHandler struct {
	notificationService *service.NotificationService
}

// NewNotificationHandler 创建通知处理器实例
func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{
		notificationService: service.NewNotificationService(),
	}
}

// CreateRequest 创建通知请求参数
type CreateNotificationRequest struct {
	Title        string `json:"title" binding:"required"`   // 标题
	Content      string `json:"content" binding:"required"` // 内容
	Type         string `json:"type"`                       // 类型: system, activity, private
	TargetUserID int64  `json:"target_user_id"`             // 目标用户ID (0 = 全员通知)
}

// Create 发布新通知
// @Summary 发布通知
// @Description 管理员发布新通知，支持全员或指定用户
// @Tags Notification
// @Security Bearer
// @Param notification body CreateNotificationRequest true "通知内容"
// @Success 200 {object} models.Notification
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/notifications [post]
func (h *NotificationHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	// 权限校验由路由层 AdminOnly 中间件统一处理

	// 参数绑定
	var req CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	// 调用服务层
	notification, err := h.notificationService.Create(userID, req.Title, req.Content, req.Type, req.TargetUserID)
	if err != nil {
		response.HandleServiceError(c, err, "创建通知失败")
		return
	}

	response.Success(c, notification)
}

// Update 更新通知内容
// @Summary 更新通知
// @Description 修改现有通知的标题、内容等信息(仅限管理员)
// @Tags Notification
// @Security Bearer
// @Param id path int true "通知ID"
// @Param notification body CreateNotificationRequest true "更新内容"
// @Success 200 {object} models.Notification
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/notifications/{id} [put]
func (h *NotificationHandler) Update(c *gin.Context) {
	// 权限校验由路由层 AdminOnly 中间件统一处理
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的通知ID")
		return
	}

	// 参数绑定
	var req CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	// 执行更新
	notification, err := h.notificationService.Update(id, req.Title, req.Content, req.Type, req.TargetUserID)
	if err != nil {
		response.HandleServiceError(c, err, "更新通知失败")
		return
	}

	response.Success(c, notification)
}

// List 获取我的通知列表
// @Summary 获取通知列表
// @Description 分页获取当前用户的通知（含系统全员通知和私信）
// @Tags Notification
// @Security Bearer
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Success 200 {object} response.PageResult
// @Router /api/v1/notifications [get]
func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	page, pageSize := response.GetPagination(c)

	var notifications []models.Notification
	var total int64
	var err error

	// 统一使用 ListByUser，确保能获取到 is_read 状态
	// 这里不再区分 Admin，让 Admin 也拥有正常的"收件箱"体验
	notifications, total, err = h.notificationService.ListByUser(userID, page, pageSize)

	if err != nil {
		response.HandleServiceError(c, err, "获取通知列表失败")
		return
	}

	response.SuccessPage(c, notifications, total, page, pageSize)
}

// MarkAsRead 标记通知为已读
// @Summary 标记已读
// @Description 将指定通知标记为当前用户已读
// @Tags Notification
// @Security Bearer
// @Param id path int true "通知ID"
// @Success 200 {string} string "操作成功"
// @Router /api/v1/notifications/{id}/read [put]
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的通知ID")
		return
	}

	if err := h.notificationService.MarkAsRead(id, userID); err != nil {
		response.HandleServiceError(c, err, "标记已读失败")
		return
	}

	response.SuccessWithMessage(c, "已标记为已读", nil)
}

// Delete 删除通知
// @Summary 删除通知
// @Description 管理员删除指定通知
// @Tags Notification
// @Security Bearer
// @Param id path int true "通知ID"
// @Success 200 {string} string "删除成功"
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/notifications/{id} [delete]
func (h *NotificationHandler) Delete(c *gin.Context) {
	// 权限校验由路由层 AdminOnly 中间件统一处理

	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的通知ID")
		return
	}

	if err := h.notificationService.Delete(id); err != nil {
		response.HandleServiceError(c, err, "删除通知失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

// UnreadCount 获取未读数量
// @Summary 未读通知数
// @Description 获取当前用户的未读通知总数
// @Tags Notification
// @Security Bearer
// @Success 200 {object} map[string]int64
// @Router /api/v1/notifications/unread-count [get]
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID := c.GetInt64("user_id")

	count, err := h.notificationService.GetUnreadCount(userID)
	if err != nil {
		response.HandleServiceError(c, err, "获取未读数失败")
		return
	}

	response.Success(c, gin.H{"count": count})
}

// ListUsers 获取可选用户列表
// @Summary 获取用户列表
// @Description 获取所有用户列表，用于发送通知时选择目标(仅限管理员)
// @Tags Notification
// @Security Bearer
// @Success 200 {array} models.User
// @Failure 403 {string} string "无权操作"
// @Router /api/v1/notifications/users [get]
func (h *NotificationHandler) ListUsers(c *gin.Context) {
	// 权限校验由路由层 AdminOnly 中间件统一处理

	users, err := h.notificationService.ListUsers()
	if err != nil {
		response.HandleServiceError(c, err, "获取用户列表失败")
		return
	}

	response.Success(c, users)
}

// Get 获取通知详情
// @Summary 通知详情
// @Description 根据ID获取通知详细信息
// @Tags Notification
// @Security Bearer
// @Param id path int true "通知ID"
// @Success 200 {object} models.Notification
// @Router /api/v1/notifications/{id} [get]
func (h *NotificationHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := response.ParseIDParam(c, "id")
	if err != nil {
		response.ParamError(c, "无效的通知ID")
		return
	}

	notification, err := h.notificationService.GetForUser(userID, id)
	if err != nil {
		response.HandleServiceError(c, err, "获取通知详情失败")
		return
	}

	response.Success(c, notification)
}
