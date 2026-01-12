package handler

import (
	"strconv"

	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/middleware"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	authService *service.AuthService
}

func NewUserHandler() *UserHandler {
	return &UserHandler{
		authService: service.NewAuthService(),
	}
}

// ensureAdmin 检查当前用户是否为管理员
func (h *UserHandler) ensureAdmin(c *gin.Context) bool {
	role := middleware.GetRole(c)
	if role != "admin" {
		response.Error(c, response.CodeForbidden, "权限不足")
		return false
	}
	return true
}

// List 获取用户列表
func (h *UserHandler) List(c *gin.Context) {
	if !h.ensureAdmin(c) {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	keyword := c.Query("keyword")

	result, err := h.authService.ListUsers(page, pageSize, keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// Create 创建用户
func (h *UserHandler) Create(c *gin.Context) {
	if !h.ensureAdmin(c) {
		return
	}

	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	if err := h.authService.CreateUser(req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "用户创建成功", nil)
}

// Update 更新用户
func (h *UserHandler) Update(c *gin.Context) {
	if !h.ensureAdmin(c) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的用户ID")
		return
	}

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	if err := h.authService.UpdateUser(id, req); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "更新成功", nil)
}

// Delete 删除用户
func (h *UserHandler) Delete(c *gin.Context) {
	if !h.ensureAdmin(c) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的用户ID")
		return
	}

	// 简单的自我保护：不能删除自己
	currentUserID := middleware.GetUserID(c)
	if id == currentUserID {
		response.ParamError(c, "不能删除当前登录账号")
		return
	}

	if err := h.authService.DeleteUser(id); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

// ResetPassword 重置密码
func (h *UserHandler) ResetPassword(c *gin.Context) {
	if !h.ensureAdmin(c) {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的用户ID")
		return
	}

	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	if err := h.authService.ResetPassword(id, req.NewPassword); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "密码重置成功", nil)
}
