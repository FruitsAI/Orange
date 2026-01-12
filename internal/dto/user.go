package dto

import "github.com/FruitsAI/Orange/internal/models"

// CreateUserRequest 管理员创建用户请求
type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role"` // admin or user
}

// UpdateUserRequest 管理员更新用户请求
type UpdateUserRequest struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Department string `json:"department"`
	Position   string `json:"position"`
	Role       string `json:"role"`
	Status     int    `json:"status"` // 1: active, 0: disabled
}

// ResetPasswordRequest 管理员重置密码
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// UserPageResult 用户分页结果
type UserPageResult struct {
	List  []models.User `json:"list"`
	Total int64         `json:"total"`
}
