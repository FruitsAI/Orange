package router

import (
	"net/http"

	"github.com/FruitsAI/Orange/internal/handler"
	"github.com/FruitsAI/Orange/internal/middleware"
	"github.com/gin-gonic/gin"
)

// NewRouter 创建并配置 Gin 路由
func NewRouter() *gin.Engine {
	router := gin.New()

	// 中间件
	router.Use(middleware.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// 健康检查
	router.GET("/api/health", healthCheck)

	// API v1 路由组
	v1 := router.Group("/api/v1")
	{
		// 认证路由（无需鉴权）
		auth := v1.Group("/auth")
		{
			authHandler := handler.NewAuthHandler()
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
			auth.POST("/logout", authHandler.Logout)
		}

		// ========== 以下路由需要鉴权 ==========
		authorized := v1.Group("")
		authorized.Use(middleware.JWTAuth())
		{
			// 用户路由
			users := authorized.Group("/users")
			{
				authHandler := handler.NewAuthHandler()
				users.GET("/me", authHandler.GetCurrentUser)
				users.PUT("/me", authHandler.UpdateProfile)
				users.PUT("/me/password", authHandler.ChangePassword)
			}

			// 项目路由
			projects := authorized.Group("/projects")
			{
				projectHandler := handler.NewProjectHandler()
				projects.GET("", projectHandler.List)
				projects.GET("/:id", projectHandler.Get)
				projects.POST("", projectHandler.Create)
				projects.PUT("/:id", projectHandler.Update)
				projects.DELETE("/:id", projectHandler.Delete)
				projects.POST("/:id/archive", projectHandler.Archive)

				// 项目收款
				paymentHandler := handler.NewPaymentHandler()
				projects.GET("/:id/payments", paymentHandler.GetByProject)
			}

			// 收款路由
			payments := authorized.Group("/payments")
			{
				paymentHandler := handler.NewPaymentHandler()
				payments.GET("", paymentHandler.List)
				payments.POST("", paymentHandler.Create)
				payments.PUT("/:id", paymentHandler.Update)
				payments.DELETE("/:id", paymentHandler.Delete)
				payments.POST("/:id/confirm", paymentHandler.Confirm)
			}

			// 仪表盘路由
			dashboard := authorized.Group("/dashboard")
			{
				dashboardHandler := handler.NewDashboardHandler()
				dashboard.GET("/stats", dashboardHandler.Stats)
				dashboard.GET("/income-trend", dashboardHandler.IncomeTrend)
				dashboard.GET("/recent-projects", dashboardHandler.RecentProjects)
				dashboard.GET("/upcoming-payments", dashboardHandler.UpcomingPayments)
			}

			// 字典路由
			dictionaries := authorized.Group("/dictionaries")
			{
				dictHandler := handler.NewDictionaryHandler()
				dictionaries.GET("", dictHandler.List)
				dictionaries.GET("/:code/items", dictHandler.GetItems)
				dictionaries.POST("/:code/items", dictHandler.CreateItem)
				dictionaries.PUT("/:code/items/:id", dictHandler.UpdateItem)
				dictionaries.DELETE("/:code/items/:id", dictHandler.DeleteItem)
			}

			// 通知路由
			notifications := authorized.Group("/notifications")
			{
				notificationHandler := handler.NewNotificationHandler()
				notifications.GET("", notificationHandler.List)
				notifications.POST("", notificationHandler.Create)
				notifications.GET("/:id", notificationHandler.Get)
				notifications.PUT("/:id", notificationHandler.Update)
				notifications.GET("/unread-count", notificationHandler.UnreadCount)
				notifications.GET("/users", notificationHandler.ListUsers)
				notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
				notifications.DELETE("/:id", notificationHandler.Delete)
			}

			// System routes
			system := authorized.Group("/system")
			{
				systemHandler := handler.NewSystemHandler()
				system.GET("/updates/check", systemHandler.CheckUpdate)
			}
		}
	}

	return router
}

// healthCheck 健康检查接口
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data": gin.H{
			"service": "Orange API",
			"version": "1.0.0",
		},
	})
}

// corsMiddleware CORS 跨域中间件
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
