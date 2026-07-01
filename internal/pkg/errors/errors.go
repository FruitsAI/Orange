package errors

import (
	"errors"
	"fmt"
)

// BizError 业务错误类型
// 用于区分业务逻辑错误与系统错误,便于Handler层返回合适的HTTP状态码。
type BizError struct {
	Code    int    // HTTP状态码 (400/403/404/500等)
	Message string // 用户友好的错误消息
	Err     error  // 底层错误 (可选,用于日志记录)
}

// Error 实现 error 接口
func (e *BizError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap 实现 errors.Unwrap 接口,支持错误链
func (e *BizError) Unwrap() error {
	return e.Err
}

// 预定义业务错误
var (
	// 400 Bad Request - 客户端参数错误
	ErrInvalidParam      = &BizError{Code: 400, Message: "参数错误"}
	ErrContractDuplicate = &BizError{Code: 400, Message: "合同编号已存在"}
	ErrInvalidStatus     = &BizError{Code: 400, Message: "状态值无效"}

	// 401 Unauthorized - 未认证
	ErrUnauthorized = &BizError{Code: 401, Message: "未授权,请先登录"}
	ErrInvalidToken = &BizError{Code: 401, Message: "令牌无效或已过期"}

	// 403 Forbidden - 无权限
	ErrForbidden    = &BizError{Code: 403, Message: "无权访问此资源"}
	ErrNotOwner     = &BizError{Code: 403, Message: "您不是此资源的所有者"}
	ErrAdminOnly    = &BizError{Code: 403, Message: "此操作仅限管理员"}

	// 404 Not Found - 资源不存在
	ErrNotFound        = &BizError{Code: 404, Message: "资源不存在"}
	ErrProjectNotFound = &BizError{Code: 404, Message: "项目不存在"}
	ErrPaymentNotFound = &BizError{Code: 404, Message: "款项不存在"}
	ErrUserNotFound    = &BizError{Code: 404, Message: "用户不存在"}

	// 409 Conflict - 资源冲突
	ErrConflict         = &BizError{Code: 409, Message: "资源冲突"}
	ErrUsernameExists   = &BizError{Code: 409, Message: "用户名已存在"}
	ErrEmailExists      = &BizError{Code: 409, Message: "邮箱已被注册"}

	// 500 Internal Server Error - 系统错误
	ErrInternal     = &BizError{Code: 500, Message: "服务器内部错误"}
	ErrDatabase     = &BizError{Code: 500, Message: "数据库操作失败"}
	ErrTransaction  = &BizError{Code: 500, Message: "事务执行失败"}
)

// New 创建一个新的业务错误
func New(code int, message string) *BizError {
	return &BizError{
		Code:    code,
		Message: message,
	}
}

// Wrap 包装底层错误为业务错误
// 用于保留原始错误信息,同时提供用户友好的消息。
//
// 示例:
//   err := db.Create(&project).Error
//   return errors.Wrap(err, "创建项目失败")
func Wrap(err error, message string) *BizError {
	if err == nil {
		return nil
	}
	return &BizError{
		Code:    500,
		Message: message,
		Err:     err,
	}
}

// WrapWithCode 包装底层错误并指定HTTP状态码
func WrapWithCode(err error, code int, message string) *BizError {
	if err == nil {
		return nil
	}
	return &BizError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// IsBizError 判断是否为业务错误
func IsBizError(err error) bool {
	var bizErr *BizError
	return errors.As(err, &bizErr)
}

// GetBizError 从错误链中提取业务错误
func GetBizError(err error) *BizError {
	var bizErr *BizError
	if errors.As(err, &bizErr) {
		return bizErr
	}
	return nil
}

// GetHTTPCode 获取错误对应的HTTP状态码
// 如果是业务错误,返回其Code;否则返回500。
func GetHTTPCode(err error) int {
	if bizErr := GetBizError(err); bizErr != nil {
		return bizErr.Code
	}
	return 500
}
