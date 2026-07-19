package handler

import (
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/service"
	"github.com/gin-gonic/gin"
)

// AuthHandler 认证模块接口处理器
// 负责处理所有与用户认证授权相关的 HTTP 请求。
type AuthHandler struct {
	authService    *service.AuthService
	profileService *service.ProfileService
}

// NewAuthHandler 创建认证处理器实例
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		authService:    service.NewAuthService(),
		profileService: service.NewProfileService(),
	}
}

// Login 用户登录接口
// @Summary 用户登录
// @Description 验证用户名密码并返回JWT Token
// @Tags Auth
// @Accept json
// @Produce json
// @Param login body dto.LoginRequest true "登录参数"
// @Success 200 {object} dto.LoginResult
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	// 1. 绑定并校验请求参数
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "用户名和密码不能为空")
		return
	}

	// 2. 调用服务层登录逻辑
	result, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		response.HandleServiceError(c, err, "登录失败")
		return
	}

	// 3. 返回 Token 及用户信息
	response.Success(c, gin.H{
		"token": result.Token,
		"user":  result.User,
	})
}

// Logout 退出登录
// @Summary 退出登录
// @Description 客户端登出（当前由前端清除Token，后端仅做预留）
// @Tags Auth
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	response.SuccessWithMessage(c, "退出成功", nil)
}

// GetCurrentUser 获取当前用户信息
// @Summary 获取当前用户信息
// @Description 获取当前登录用户的详细资料
// @Tags User
// @Security Bearer
// @Success 200 {object} models.User
// @Router /api/v1/users/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		response.Unauthorized(c)
		return
	}

	user, err := h.profileService.GetCurrentUser(userID)
	if err != nil {
		response.HandleServiceError(c, err, "获取用户信息失败")
		return
	}

	response.Success(c, user)
}

// UpdateProfile 更新个人资料
// @Summary 更新个人资料
// @Description 更新当前用户的姓名、邮箱、职位等信息
// @Tags User
// @Security Bearer
// @Param profile body dto.UpdateProfileRequest true "更新参数"
// @Success 200 {object} models.User
// @Router /api/v1/users/me [put]
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		response.Unauthorized(c)
		return
	}

	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	user, err := h.profileService.UpdateProfile(userID, req.Name, req.Email, req.Phone, req.Department, req.Position)
	if err != nil {
		response.HandleServiceError(c, err, "更新个人资料失败")
		return
	}

	response.Success(c, user)
}

// ChangePassword 修改密码
// @Summary 修改密码
// @Description 修改当前登录用户的密码
// @Tags User
// @Security Bearer
// @Param password body dto.ChangePasswordRequest true "密码修改参数"
// @Success 200 {string} string "此处返回成功消息"
// @Router /api/v1/users/me/password [put]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		response.Unauthorized(c)
		return
	}

	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, err.Error())
		return
	}

	if err := h.profileService.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		response.HandleServiceError(c, err, "修改密码失败")
		return
	}

	response.SuccessWithMessage(c, "密码修改成功", nil)
}
