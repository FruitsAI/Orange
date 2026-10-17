import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notificationApi, type Notification, type UserBrief } from '@/api/notification'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  FormActions,
  IconButton,
  Input,
  Modal,
  PaginationBar,
  SectionHeader,
  Select,
  Spinner,
  Surface,
  TextArea,
} from '@/design-system'

interface NotificationManagementProps {
  isAdmin?: boolean
}

interface NotificationForm {
  content: string
  target_user_id: number
  title: string
  type: string
}

const emptyNotification: NotificationForm = {
  content: '',
  target_user_id: 0,
  title: '',
  type: 'system',
}

const getNotificationTypeName = (type: number) => {
  if (type === 2) return '活动'
  if (type === 3) return '私信'
  return '系统'
}

const getNotificationIcon = (type: number) => {
  if (type === 2) return 'ri-calendar-event-line'
  if (type === 3) return 'ri-mail-send-line'
  return 'ri-settings-3-line'
}

const getFormType = (type: number) => {
  if (type === 2) return 'activity'
  return 'system'
}

export default function NotificationManagement({ isAdmin = false }: NotificationManagementProps) {
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationTotal, setNotificationTotal] = useState(0)
  const [targetUsers, setTargetUsers] = useState<UserBrief[]>([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationCurrentPage, setNotificationCurrentPage] = useState(1)
  const [notificationPageSize, setNotificationPageSize] = useState(5)
  const [showCreateNotificationModal, setShowCreateNotificationModal] = useState(false)
  const [creatingNotification, setCreatingNotification] = useState(false)
  const [newNotification, setNewNotification] = useState<NotificationForm>(emptyNotification)
  const [showNotificationDetailModal, setShowNotificationDetailModal] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isEditingNotification, setIsEditingNotification] = useState(false)
  const notificationsRequestRef = useRef(0)
  const targetUsersRequestRef = useRef(0)
  const mutationInFlightRef = useRef(false)

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )
  const systemNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 1).length,
    [notifications],
  )
  const notificationTotalPages = Math.ceil(notificationTotal / notificationPageSize)
  const notificationPaginationInfo = useMemo(() => {
    if (notificationTotal === 0) return '暂无数据'
    const start = (notificationCurrentPage - 1) * notificationPageSize + 1
    const end = Math.min(notificationCurrentPage * notificationPageSize, notificationTotal)
    return `显示 ${start}-${end} 条，共 ${notificationTotal} 条`
  }, [notificationCurrentPage, notificationPageSize, notificationTotal])

  const loadNotifications = useCallback(async () => {
    const requestId = ++notificationsRequestRef.current
    setNotificationLoading(true)
    try {
      const response = await notificationApi.list(notificationCurrentPage, notificationPageSize)
      if (requestId === notificationsRequestRef.current) {
        setNotifications(response.data.data.list)
        setNotificationTotal(response.data.data.total)
      }
    } catch {
      if (requestId === notificationsRequestRef.current) toastError('获取通知失败')
    } finally {
      if (requestId === notificationsRequestRef.current) setNotificationLoading(false)
    }
  }, [notificationCurrentPage, notificationPageSize, toastError])

  const loadTargetUsers = useCallback(async () => {
    const requestId = ++targetUsersRequestRef.current
    try {
      const response = await notificationApi.getUsers()
      if (requestId === targetUsersRequestRef.current) setTargetUsers(response.data.data)
    } catch {
      if (requestId === targetUsersRequestRef.current) toastError('获取用户列表失败')
    }
  }, [toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadNotifications, 0)
    return () => {
      window.clearTimeout(timer)
      notificationsRequestRef.current += 1
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!isAdmin) return undefined
    const timer = window.setTimeout(loadTargetUsers, 0)
    return () => {
      window.clearTimeout(timer)
      targetUsersRequestRef.current += 1
    }
  }, [isAdmin, loadTargetUsers])

  const openCreateModal = () => {
    setIsEditingNotification(false)
    setSelectedNotification(null)
    setNewNotification(emptyNotification)
    setShowCreateNotificationModal(true)
  }

  const handleCreateNotification = async () => {
    if (mutationInFlightRef.current) return
    if (!newNotification.title || !newNotification.content) {
      toastError('请填写标题和内容')
      return
    }

    mutationInFlightRef.current = true
    setCreatingNotification(true)
    try {
      await notificationApi.create(newNotification)
      toastSuccess('发送成功')
      setShowCreateNotificationModal(false)
      setNewNotification(emptyNotification)
      await loadNotifications()
    } catch {
      toastError('发送失败')
    } finally {
      mutationInFlightRef.current = false
      setCreatingNotification(false)
    }
  }

  const handleDeleteNotification = async (id: number) => {
    const confirmed = await confirm({
      actionLabel: '删除通知',
      actionVariant: 'danger',
      message: '确定要删除这条通知吗？',
      title: '确认删除',
    })
    if (!confirmed) return

    try {
      await notificationApi.delete(id)
      toastSuccess('删除成功')
      await loadNotifications()
    } catch {
      toastError('删除失败')
    }
  }

  const viewNotificationDetail = async (notification: Notification) => {
    setSelectedNotification(notification)
    setIsEditingNotification(false)
    setShowNotificationDetailModal(true)

    if (!notification.is_read) {
      try {
        await notificationApi.markAsRead(notification.id)
        notificationsRequestRef.current += 1
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        )
      } catch {
        toastError('标记已读失败')
      }
    }
  }

  const editNotification = (notification: Notification) => {
    setNewNotification({
      content: notification.content,
      target_user_id: notification.is_global === 1 ? 0 : 0,
      title: notification.title,
      type: getFormType(notification.type),
    })
    setSelectedNotification(notification)
    setIsEditingNotification(true)
    setShowCreateNotificationModal(true)
  }

  const handleUpdateNotification = async () => {
    if (!selectedNotification || mutationInFlightRef.current) return
    if (!newNotification.title || !newNotification.content) {
      toastError('请填写标题和内容')
      return
    }

    mutationInFlightRef.current = true
    setCreatingNotification(true)
    try {
      await notificationApi.update(selectedNotification.id, newNotification)
      toastSuccess('更新成功')
      setShowCreateNotificationModal(false)
      await loadNotifications()
    } catch {
      toastError('更新失败')
    } finally {
      mutationInFlightRef.current = false
      setCreatingNotification(false)
    }
  }

  return (
    <div className="notification-management">
      <div className="settings-panel-header">
        <SectionHeader
          actions={
            isAdmin ? (
              <Button onClick={openCreateModal}>
                <i className="ri-add-line" />
                <span>发送通知</span>
              </Button>
            ) : null
          }
          description={`查看系统消息${isAdmin ? '，管理员可发送通知' : ''}`}
          icon={<i className="ri-notification-3-line" />}
          iconTone="warning"
          size="lg"
          title="通知管理"
        />

        <div className="dev-stats">
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="info">
              <i className="ri-mail-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{notificationTotal}</span>
              <span className="dev-stat-label">总通知</span>
            </div>
          </Card.Root>
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="warning">
              <i className="ri-mail-unread-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{unreadNotifications}</span>
              <span className="dev-stat-label">未读</span>
            </div>
          </Card.Root>
          <Card.Root className="dev-stat-card" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="dev-stat-icon" padding="none" radius="control" tone="info">
              <i className="ri-computer-line" />
            </Surface>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{systemNotifications}</span>
              <span className="dev-stat-label">系统</span>
            </div>
          </Card.Root>
        </div>
      </div>

      <div className="dev-content">
        {notificationLoading ? (
          <Spinner className="dev-loading" label="正在加载通知列表" size="lg" />
        ) : notifications.length === 0 ? (
          <EmptyState
            className="dev-empty"
            description="目前没有收到任何系统消息"
            icon={<i className="ri-notification-off-line" />}
            size="lg"
            title="暂无通知"
          />
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <Card.Root
                className="notification-card"
                gap="none"
                key={notification.id}
                padding="none"
                tone={!notification.is_read ? 'warning' : 'neutral'}
              >
                <div className="notification-inner">
                  <Surface
                    className="notification-type-icon"
                    padding="none"
                    radius="control"
                    tone={
                      notification.type === 2
                        ? 'danger'
                        : notification.type === 3
                          ? 'accent'
                          : 'neutral'
                    }
                    variant="inset"
                  >
                    <i className={getNotificationIcon(notification.type)} />
                  </Surface>

                  <div className="notification-body">
                    <div className="notification-header-row">
                      <div className="notification-tags">
                        <Chip
                          size="sm"
                          tone={
                            notification.type === 2
                              ? 'danger'
                              : notification.type === 3
                                ? 'accent'
                                : 'neutral'
                          }
                        >
                          {getNotificationTypeName(notification.type)}
                        </Chip>
                        <Chip size="sm" variant="outline">
                          {notification.is_global === 1 ? '全员' : '私信'}
                        </Chip>
                      </div>
                    </div>

                    <h4 className="notification-title">
                      {!notification.is_read ? <span className="unread-dot" /> : null}
                      {notification.title}
                    </h4>

                    <p className="notification-desc">{notification.content}</p>

                    {notification.sender ? (
                      <div className="notification-sender">
                        <i className="ri-user-line" />
                        <span>{notification.sender.name}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="notification-right">
                    <Button
                      aria-label={`查看通知：${notification.title}`}
                      onClick={() => void viewNotificationDetail(notification)}
                      size="sm"
                      variant="ghost"
                    >
                      查看
                    </Button>
                    {isAdmin ? (
                      <div className="notification-actions">
                        <IconButton
                          label="编辑通知"
                          onClick={() => editNotification(notification)}
                          size="sm"
                          title="编辑"
                          variant="ghost"
                        >
                          <i className="ri-edit-line" />
                        </IconButton>
                        <IconButton
                          label="删除通知"
                          onClick={() => void handleDeleteNotification(notification.id)}
                          size="sm"
                          title="删除"
                          variant="danger"
                        >
                          <i className="ri-delete-bin-line" />
                        </IconButton>
                      </div>
                    ) : null}
                    <span className="notification-time">
                      {new Date(notification.create_time).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card.Root>
            ))}
          </div>
        )}

        {notifications.length > 0 ? (
          <PaginationBar
            info={notificationPaginationInfo}
            onPageChange={setNotificationCurrentPage}
            page={notificationCurrentPage}
            pageCount={notificationTotalPages}
            separated
            trailing={
              <Select
                aria-label="每页通知数"
                onValueChange={(value) => {
                  setNotificationPageSize(Number(value))
                  setNotificationCurrentPage(1)
                }}
                options={[
                  { label: '5条/页', value: '5' },
                  { label: '10条/页', value: '10' },
                ]}
                size="sm"
                value={String(notificationPageSize)}
              />
            }
          />
        ) : null}
      </div>

      <Modal.Root
        onClose={() => setShowCreateNotificationModal(false)}
        open={showCreateNotificationModal}
      >
        <Modal.Header>{isEditingNotification ? '编辑通知' : '发送通知'}</Modal.Header>
        <Modal.Close label={isEditingNotification ? '关闭编辑通知弹窗' : '关闭发送通知弹窗'} />
        <Modal.Body className="settings-modal-body">
          <Field.Root required>
            <Field.Label>通知标题</Field.Label>
            <Input
              onChange={(event) =>
                setNewNotification((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="请输入通知标题"
              value={newNotification.title}
            />
          </Field.Root>
          <Field.Root required>
            <Field.Label>通知内容</Field.Label>
            <TextArea
              onChange={(event) =>
                setNewNotification((current) => ({ ...current, content: event.target.value }))
              }
              placeholder="请输入通知内容"
              rows={4}
              value={newNotification.content}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>通知类型</Field.Label>
            <Select
              aria-label="通知类型"
              onValueChange={(value) =>
                setNewNotification((current) => ({ ...current, type: value }))
              }
              options={[
                { label: '系统通知', value: 'system' },
                { label: '活动通知', value: 'activity' },
              ]}
              value={newNotification.type}
            />
          </Field.Root>
          {isAdmin ? (
            <Field.Root>
              <Field.Label>发送对象</Field.Label>
              <Select
                aria-label="发送对象"
                onValueChange={(value) =>
                  setNewNotification((current) => ({
                    ...current,
                    target_user_id: Number(value),
                  }))
                }
                options={[
                  { label: '全员通知', value: '0' },
                  ...targetUsers.map((targetUser) => ({
                    label: `${targetUser.name} (${targetUser.username})`,
                    value: String(targetUser.id),
                  })),
                ]}
                value={String(newNotification.target_user_id)}
              />
            </Field.Root>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <FormActions>
            <Button onClick={() => setShowCreateNotificationModal(false)} variant="secondary">
              取消
            </Button>
            <Button
              onClick={() =>
                void (isEditingNotification
                  ? handleUpdateNotification()
                  : handleCreateNotification())
              }
              pending={creatingNotification}
            >
              {creatingNotification ? '提交中...' : isEditingNotification ? '更新' : '发送'}
            </Button>
          </FormActions>
        </Modal.Footer>
      </Modal.Root>

      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setShowNotificationDetailModal(false)}
        open={showNotificationDetailModal}
      />
    </div>
  )
}
