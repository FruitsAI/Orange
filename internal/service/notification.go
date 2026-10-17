package service

import (
	"errors"

	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/repository"
)

// NotificationService 通知与消息服务
// 负责系统通知的发布、管理、分发以及用户阅读状态的维护。
// 支持全员广播、特定活动通知及私人消息。
//
// 依赖:
//   - NotificationRepository: 通知数据持久化接口
type NotificationService struct {
	notificationRepo *repository.NotificationRepository
}

// NewNotificationService 创建通知服务实例
func NewNotificationService() *NotificationService {
	return &NotificationService{
		notificationRepo: repository.NewNotificationRepository(),
	}
}

// Create 发布新通知（通常由管理员操作）
//
// 参数:
//   - senderID: 发送者ID
//   - title: 标题
//   - content: 内容
//   - notificationType: 通知类型 "system"(1), "activity"(2), "private"(3)
//   - targetUserID: 接收目标用户ID (0表示发送给全员)
//
// 返回:
//   - *models.Notification: 创建成功的通知实体
//   - error: 校验失败或数据库错误
func (s *NotificationService) Create(senderID int64, title, content, notificationType string, targetUserID int64) (*models.Notification, error) {
	// 1. 基础校验
	if title == "" {
		return nil, errors.New("标题不能为空")
	}
	if content == "" {
		return nil, errors.New("内容不能为空")
	}

	// 2. 类型映射转换 (string -> int)
	// 1:system (系统通知), 2:activity (活动/营销), 3:private (私信)
	var typeInt int
	switch notificationType {
	case "activity":
		typeInt = 2
	case "private":
		typeInt = 3
	default:
		typeInt = 1 // 默认为系统通知
	}

	// 3. 判定发送范围 (全员 vs 个人)
	var isGlobal int
	if targetUserID == 0 {
		isGlobal = 1 // 标记为全局/全员通知
	} else {
		isGlobal = 0 // 标记为特定用户通知
	}

	// 4. 构建实体
	notification := &models.Notification{
		Title:    title,
		Content:  content,
		Type:     typeInt,
		SenderID: senderID,
		IsGlobal: isGlobal,
	}

	// 5. 写入数据库 (Repo层在处理非Global通知时可能会同时插入关联表)
	if err := s.notificationRepo.Create(notification, targetUserID); err != nil {
		return nil, errors.New("创建通知失败")
	}

	return notification, nil
}

// Update 更新通知内容（仅管理员）
// 注意：目前支持修改标题、内容、类型和范围标记。
// 如果涉及到接收关系的变更（如从全员改为私信），需要在Repo层有相应的处理逻辑。
//
// 参数:
//   - id: 通知ID
//   - title, content...: 更新字段
//
// 返回:
//   - *models.Notification: 更新后的实体
//   - error: 不存在或更新错误
func (s *NotificationService) Update(id int64, title, content, notificationType string, targetUserID int64) (*models.Notification, error) {
	// 1. 检查是否存在
	notification, err := s.notificationRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("通知不存在")
	}

	if title == "" {
		return nil, errors.New("标题不能为空")
	}
	if content == "" {
		return nil, errors.New("内容不能为空")
	}

	// 2. 类型处理
	var typeInt int
	switch notificationType {
	case "activity":
		typeInt = 2
	case "private":
		typeInt = 3
	default:
		typeInt = 1
	}

	// 3. 范围处理
	var isGlobal int
	if targetUserID == 0 {
		isGlobal = 1
	} else {
		isGlobal = 0
	}

	// 4. 更新字段
	notification.Title = title
	notification.Content = content
	notification.Type = typeInt
	notification.IsGlobal = isGlobal

	// 注意：Update 目前只更新通知表基本信息，未涉及 user_notifications 关系的调整
	// 如果需要支持从 私信改全员 或 全员改私信 的复杂逻辑，需要repo层配合修改

	// 5. 执行更新
	if err := s.notificationRepo.Update(notification); err != nil {
		return nil, errors.New("更新通知失败")
	}

	return notification, nil
}

// ListByUser 分页获取指定用户的通知列表
// 包含全员通知和发送给该用户的私信。
func (s *NotificationService) ListByUser(userID int64, page, pageSize int) ([]models.Notification, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize
	return s.notificationRepo.ListByUser(userID, offset, pageSize)
}

// ListAll 获取系统所有通知（管理后台用）
func (s *NotificationService) ListAll(page, pageSize int) ([]models.Notification, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize
	return s.notificationRepo.ListAll(offset, pageSize)
}

// MarkAsRead 将通知标记为已读
// 在 user_notifications 表中插入或更新记录。
func (s *NotificationService) MarkAsRead(id int64, userID int64) error {
	return s.notificationRepo.MarkAsRead(id, userID)
}

// Delete 删除通知 (软删除或物理删除，取决于Repo实现)
func (s *NotificationService) Delete(id int64) error {
	return s.notificationRepo.Delete(id)
}

// GetUnreadCount 统计用户的未读通知数量
func (s *NotificationService) GetUnreadCount(userID int64) (int64, error) {
	return s.notificationRepo.GetUnreadCount(userID)
}

// ListUsers 获取所有用户简要信息列表（用于发布通知时选择接收人）
func (s *NotificationService) ListUsers() ([]models.User, error) {
	return s.notificationRepo.ListUsers()
}

// Get 获取单个通知详情
func (s *NotificationService) Get(id int64) (*models.Notification, error) {
	return s.notificationRepo.FindByID(id)
}

func (s *NotificationService) GetForUser(userID, id int64) (*models.Notification, error) {
	return s.notificationRepo.FindByIDForUser(id, userID)
}
