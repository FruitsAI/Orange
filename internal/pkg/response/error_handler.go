package response

import (
	"log/slog"

	"github.com/FruitsAI/Orange/internal/pkg/errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// HandleServiceError 统一处理Service层返回的错误
// 根据错误类型返回对应的HTTP状态码和业务错误码。
//
// 参数:
//   - c: Gin上下文
//   - err: Service层返回的错误
//   - defaultMsg: 当错误不是业务错误时的默认消息
//
// 使用示例:
//
//	project, err := h.service.GetByID(id)
//	if err != nil {
//	    response.HandleServiceError(c, err, "查询项目失败")
//	    return
//	}
func HandleServiceError(c *gin.Context, err error, defaultMsg string) {
	// 1. 处理业务错误
	if bizErr := errors.GetBizError(err); bizErr != nil {
		// 记录错误日志 (保留底层错误信息)
		if bizErr.Err != nil {
			slog.Error("业务错误",
				"message", bizErr.Message,
				"code", bizErr.Code,
				"error", bizErr.Err,
				"path", c.Request.URL.Path,
				"user_id", c.GetInt64("user_id"),
			)
		}

		// 根据HTTP状态码返回对应的业务错误码
		code := httpCodeToBizCode(bizErr.Code)
		Error(c, code, bizErr.Message)
		return
	}

	// 2. 处理GORM特殊错误
	if err == gorm.ErrRecordNotFound {
		NotFound(c, "资源不存在")
		return
	}

	// 3. 系统错误 - 记录完整错误日志
	slog.Error("系统错误",
		"message", defaultMsg,
		"error", err,
		"path", c.Request.URL.Path,
		"user_id", c.GetInt64("user_id"),
	)
	InternalError(c, defaultMsg)
}

// httpCodeToBizCode 将HTTP状态码映射为业务错误码
func httpCodeToBizCode(httpCode int) int {
	switch httpCode {
	case 400:
		return CodeParamError
	case 401:
		return CodeUnauthorized
	case 403:
		return CodeForbidden
	case 404:
		return CodeNotFound
	case 409:
		return CodeParamError // 冲突也归类为参数错误
	case 429:
		return CodeTooManyReqs
	case 500:
		return CodeInternalError
	default:
		return CodeInternalError
	}
}
