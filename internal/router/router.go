package router

import (
	"log/slog"
	"net/http"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/handler"
	"github.com/FruitsAI/Orange/internal/middleware"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/FruitsAI/Orange/docs" // Swagger 生成的文档包
)

// NewRouter 创建并配置 Gin 路由引擎
// 包含全局中间件设置、路由分组及具体的 API 路由注册。
func NewRouter() *gin.Engine {
	router := gin.New()

	// 1. 注册全局中间件
	router.Use(middleware.Logger()) // 统一请求日志
	router.Use(gin.Recovery())      // Panic 恢复 (防止服务崩溃)
	router.Use(corsMiddleware())    // 跨域处理

	// 2. 健康检查接口 (用于负载均衡或探针检测)
	router.GET("/api/health", healthCheck)

	// 2.1 Swagger API 文档路由（仅开发环境启用）
	if gin.Mode() == gin.DebugMode {
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
		slog.Info("Swagger API docs enabled at http://localhost:3456/swagger/index.html")
	}

	// 3. API v1 路由组
	// 所有业务接口统一挂载在 /api/v1 下
	v1 := router.Group("/api/v1")
	{
		// 3.1 公开路由 (无需鉴权)
		// 认证模块: 登录、注销
		auth := v1.Group("/auth")
		{
			authHandler := handler.NewAuthHandler()
			// 登录接口应用速率限制，防止暴力破解
			auth.POST("/login", middleware.LoginRateLimiter(), authHandler.Login)
			auth.POST("/logout", authHandler.Logout) // 注销 (客户端清除)
		}

		// 3.2 受保护路由 (需要 JWT 鉴权)
		// 使用 JWTAuth 中间件验证 Authorization 头
		authorized := v1.Group("")
		authorized.Use(middleware.JWTAuth())
		{
			// 用户路由
			users := authorized.Group("/users")
			{
				authHandler := handler.NewAuthHandler()
				userHandler := handler.NewUserHandler()

				// 普通用户接口
				users.GET("/me", authHandler.GetCurrentUser)
				users.PUT("/me", authHandler.UpdateProfile)
				users.PUT("/me/password", authHandler.ChangePassword)

				// 管理员接口 (内部已做权限校验)
				users.GET("", userHandler.List)
				users.POST("", userHandler.Create)
				users.PUT("/:id", userHandler.Update)
				users.DELETE("/:id", userHandler.Delete)
				users.PUT("/:id/password", userHandler.ResetPassword)
			}

			// 项目管理模块
			projects := authorized.Group("/projects")
			{
				projectHandler := handler.NewProjectHandler()
				projects.GET("", projectHandler.List) // 项目列表

				// 工具类接口：合同编号检查与生成
				// 注意：这两个特定路径的路由必须放在 /:id 通配符之前，否则会被 /:id 优先匹配拦截
				projects.GET("/check-contract-number", projectHandler.CheckContractNumber)
				projects.GET("/generate-contract-number", projectHandler.GenerateContractNumber)

				projects.GET("/:id", projectHandler.Get)              // 项目详情
				projects.POST("", projectHandler.Create)              // 创建项目
				projects.PUT("/:id", projectHandler.Update)           // 更新项目
				projects.DELETE("/:id", projectHandler.Delete)        // 删除项目
				projects.POST("/:id/archive", projectHandler.Archive) // 归档项目

				// 项目收款
				paymentHandler := handler.NewPaymentHandler()
				projects.GET("/:id/payments", paymentHandler.GetByProject)
			}

			// 款项管理模块
			payments := authorized.Group("/payments")
			{
				paymentHandler := handler.NewPaymentHandler()
				payments.GET("", paymentHandler.List)                 // 款项列表
				payments.POST("", paymentHandler.Create)              // 创建款项
				payments.PUT("/:id", paymentHandler.Update)           // 更新款项
				payments.DELETE("/:id", paymentHandler.Delete)        // 删除款项
				payments.POST("/:id/confirm", paymentHandler.Confirm) // 确认收款
			}

			// 仪表盘统计模块
			dashboard := authorized.Group("/dashboard")
			{
				dashboardHandler := handler.NewDashboardHandler()
				dashboard.GET("/stats", dashboardHandler.Stats)
				dashboard.GET("/income-trend", dashboardHandler.IncomeTrend)
				dashboard.GET("/recent-projects", dashboardHandler.RecentProjects)
				dashboard.GET("/upcoming-payments", dashboardHandler.UpcomingPayments)
			}

			// 字典管理模块 (用于下拉选项)
			dictionaries := authorized.Group("/dictionaries")
			{
				dictHandler := handler.NewDictionaryHandler()
				dictionaries.GET("", dictHandler.List)                          // 字典类型列表
				dictionaries.GET("/:code/items", dictHandler.GetItems)          // 获取指定字典的选项
				dictionaries.POST("/:code/items", dictHandler.CreateItem)       // 新增选项
				dictionaries.PUT("/:code/items/:id", dictHandler.UpdateItem)    // 更新选项
				dictionaries.DELETE("/:code/items/:id", dictHandler.DeleteItem) // 删除选项
			}

			// 通知中心模块
			notifications := authorized.Group("/notifications")
			{
				notificationHandler := handler.NewNotificationHandler()
				notifications.GET("", notificationHandler.List)                     // 通知列表
				notifications.POST("", notificationHandler.Create)                  // 发送通知 (私信/广播)
				notifications.GET("/unread-count", notificationHandler.UnreadCount) // 未读数
				notifications.GET("/users", notificationHandler.ListUsers)          // 可通知用户列表
				notifications.GET("/:id", notificationHandler.Get)                  // 通知详情
				notifications.PUT("/:id", notificationHandler.Update)               // 更新通知
				notifications.PUT("/:id/read", notificationHandler.MarkAsRead)      // 标记已读
				notifications.DELETE("/:id", notificationHandler.Delete)            // 删除通知
			}

			// 个人访问令牌模块
			tokens := authorized.Group("/tokens")
			{
				tokenHandler := handler.NewTokenHandler()
				tokens.POST("", tokenHandler.Create)            // 创建令牌
				tokens.GET("", tokenHandler.List)               // 令牌列表
				tokens.POST("/:id/revoke", tokenHandler.Revoke) // 撤销令牌 (软删/禁用)
				tokens.DELETE("/:id", tokenHandler.Delete)      // 删除令牌 (硬删)
			}

			// 系统级功能模块
			system := authorized.Group("/system")
			{
				systemHandler := handler.NewSystemHandler()
				system.GET("/updates/check", systemHandler.CheckUpdate)
			}

			// 数据同步模块
			sync := authorized.Group("/sync")
			{
				syncHandler := handler.NewSyncHandler()
				sync.GET("/config", syncHandler.GetConfig)                // 获取配置
				sync.POST("/test-connection", syncHandler.TestConnection) // 测试云端数据库连接
				sync.POST("/compare", syncHandler.Compare)                // 对比本地与云端数据
				sync.POST("/execute", syncHandler.Execute)                // 执行数据同步
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
			"version": constants.AppVersion,
		},
	})
}

// corsMiddleware 处理跨域资源共享 (CORS) 问题
// 仅允许白名单中的域名访问，支持常见的 HTTP 方法和 Header。
// 同时添加安全响应头以防止常见的 Web 攻击。
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 检查是否在白名单中
		allowed := false
		for _, allowedOrigin := range config.AppConfig.AllowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// 如果在白名单中，则允许访问
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		// 设置 CORS 相关头
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		// 添加安全响应头
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		csp := "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
		if gin.Mode() == gin.DebugMode {
			csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
		}
		c.Header("Content-Security-Policy", csp)
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// 浏览器在发送复杂请求前会发送 OPTIONS 预检请求
		// 此处直接返回 204 No Content 即可
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
