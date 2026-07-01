package middleware

import (
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/gin-gonic/gin"
)

// AdminOnly 管理员权限校验中间件
// 依赖 JWTAuth 已将 role 注入上下文，非 admin 一律拒绝。
// 用于替代各 handler 内重复的 `if role != "admin"` 判断，统一鉴权入口。
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("role") != "admin" {
			response.Forbidden(c)
			return
		}
		c.Next()
	}
}
