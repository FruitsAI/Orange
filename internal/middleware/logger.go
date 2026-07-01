package middleware

import (
	"log/slog"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logger records request metadata without capturing response bodies.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !config.AppConfig.LogEnable {
			c.Next()
			return
		}

		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		fields := []zap.Field{
			zap.Int("status", statusCode),
			zap.String("method", method),
			zap.String("path", path),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
		}

		if config.AppConfig.LogLevel == "debug" {
			fields = append(fields, zap.Bool("response_body_logged", false))
		}

		if logger.Log != nil {
			logger.Log.Info("Request", fields...)
		} else {
			slog.Info("Request", "status", statusCode, "path", path)
		}
	}
}
