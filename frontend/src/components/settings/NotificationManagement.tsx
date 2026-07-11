import { useCallback, useEffect, useMemo, useState } from 'react'
import { notificationApi, type Notification, type UserBrief } from '@/api/notification'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'

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

const getVisiblePages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages: Array<number | string> = [1]
  const delta = 2
  let start = currentPage - delta
  let end = currentPage + delta

  if (start <= 2) {
    start = 2
    end = Math.min(6, totalPages - 1)
  } else if (end >= totalPages - 1) {
    end = totalPages - 1
    start = Math.max(totalPages - 5, 2)
  }

  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('...')
  if (totalPages > 1) pages.push(totalPages)

  return pages
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

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )
  const systemNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 1).length,
    [notifications],
  )
  const notificationTotalPages = Math.ceil(notificationTotal / notificationPageSize)
  const visibleNotificationPages = useMemo(
    () => getVisiblePages(notificationCurrentPage, notificationTotalPages),
    [notificationCurrentPage, notificationTotalPages],
  )
  const notificationPaginationInfo = useMemo(() => {
    if (notificationTotal === 0) return '暂无数据'
    const start = (notificationCurrentPage - 1) * notificationPageSize + 1
    const end = Math.min(notificationCurrentPage * notificationPageSize, notificationTotal)
    return `显示 ${start}-${end} 条，共 ${notificationTotal} 条`
  }, [notificationCurrentPage, notificationPageSize, notificationTotal])

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true)
    try {
      const response = await notificationApi.list(notificationCurrentPage, notificationPageSize)
      setNotifications(response.data.data.list)
      setNotificationTotal(response.data.data.total)
    } catch {
      toastError('获取通知失败')
    } finally {
      setNotificationLoading(false)
    }
  }, [notificationCurrentPage, notificationPageSize, toastError])

  const loadTargetUsers = useCallback(async () => {
    try {
      const response = await notificationApi.getUsers()
      setTargetUsers(response.data.data)
    } catch {
      toastError('获取用户列表失败')
    }
  }, [toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadNotifications, 0)
    return () => window.clearTimeout(timer)
  }, [loadNotifications])

  useEffect(() => {
    if (!isAdmin) return undefined
    const timer = window.setTimeout(loadTargetUsers, 0)
    return () => window.clearTimeout(timer)
  }, [isAdmin, loadTargetUsers])

  const notificationPrevPage = () => {
    setNotificationCurrentPage((page) => Math.max(1, page - 1))
  }

  const notificationNextPage = () => {
    setNotificationCurrentPage((page) => Math.min(notificationTotalPages, page + 1))
  }

  const notificationGoToPage = (page: number) => {
    setNotificationCurrentPage(page)
  }

  const openCreateModal = () => {
    setIsEditingNotification(false)
    setSelectedNotification(null)
    setNewNotification(emptyNotification)
    setShowCreateNotificationModal(true)
  }

  const handleCreateNotification = async () => {
    if (!newNotification.title || !newNotification.content) {
      toastError('请填写标题和内容')
      return
    }

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
      setCreatingNotification(false)
    }
  }

  const handleDeleteNotification = async (id: number) => {
    const confirmed = await confirm({ message: '确定要删除这条通知吗？', title: '确认删除' })
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
    if (!selectedNotification) return
    if (!newNotification.title || !newNotification.content) {
      toastError('请填写标题和内容')
      return
    }

    setCreatingNotification(true)
    try {
      await notificationApi.update(selectedNotification.id, newNotification)
      toastSuccess('更新成功')
      setShowCreateNotificationModal(false)
      await loadNotifications()
    } catch {
      toastError('更新失败')
    } finally {
      setCreatingNotification(false)
    }
  }

  return (
    <div className="notification-management">
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-title-section">
            <div className="dev-icon-wrapper notif-icon">
              <i className="ri-notification-3-line" />
            </div>
            <div className="dev-title-info">
              <h2 className="dev-title">通知管理</h2>
              <p className="dev-subtitle">查看系统消息{isAdmin ? '，管理员可发送通知' : ''}</p>
            </div>
          </div>
          {isAdmin ? (
            <button className="dev-create-btn" onClick={openCreateModal} type="button">
              <i className="ri-add-line" />
              <span>发送通知</span>
            </button>
          ) : null}
        </div>

        <div className="dev-stats">
          <div className="dev-stat-card">
            <div className="dev-stat-icon total">
              <i className="ri-mail-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{notificationTotal}</span>
              <span className="dev-stat-label">总通知</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon unread">
              <i className="ri-mail-unread-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{unreadNotifications}</span>
              <span className="dev-stat-label">未读</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon system">
              <i className="ri-computer-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{systemNotifications}</span>
              <span className="dev-stat-label">系统</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dev-content">
        {notificationLoading ? (
          <div className="dev-loading">
            <div className="dev-loading-spinner">
              <i className="ri-loader-4-line animate-spin" />
            </div>
            <span>正在加载通知列表...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="dev-empty">
            <div className="dev-empty-icon notif-empty-icon">
              <i className="ri-notification-off-line" />
            </div>
            <h3 className="dev-empty-title">暂无通知</h3>
            <p className="dev-empty-desc">目前没有收到任何系统消息</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <div
                className={`notification-card ${!notification.is_read ? 'unread' : ''} type-${notification.type}`}
                key={notification.id}
                onClick={() => void viewNotificationDetail(notification)}
                role="button"
                tabIndex={0}
                onKeyUp={(event) => {
                  if (event.key === 'Enter') void viewNotificationDetail(notification)
                }}
              >
                <div className="notification-inner">
                  <div className={`notification-type-icon type-${notification.type}`}>
                    <i className={getNotificationIcon(notification.type)} />
                  </div>

                  <div className="notification-body">
                    <div className="notification-header-row">
                      <div className="notification-tags">
                        <span className={`notification-tag tag-${notification.type}`}>
                          {getNotificationTypeName(notification.type)}
                        </span>
                        <span className="notification-scope">
                          {notification.is_global === 1 ? '全员' : '私信'}
                        </span>
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
                    {isAdmin ? (
                      <div className="notification-actions">
                        <button
                          className="action-btn"
                          onClick={(event) => {
                            event.stopPropagation()
                            editNotification(notification)
                          }}
                          title="编辑"
                          type="button"
                        >
                          <i className="ri-edit-line" />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeleteNotification(notification.id)
                          }}
                          title="删除"
                          type="button"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    ) : null}
                    <span className="notification-time">{new Date(notification.create_time).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length > 0 ? (
          <div className="notification-pagination">
            <div className="pagination-inner">
              <span className="pagination-info">{notificationPaginationInfo}</span>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={notificationCurrentPage === 1}
                  onClick={notificationPrevPage}
                  type="button"
                >
                  <i className="ri-arrow-left-s-line" />
                </button>

                <div className="page-numbers">
                  {visibleNotificationPages.map((page, index) => (
                    <button
                      className={`page-number ${notificationCurrentPage === page ? 'active' : ''} ${
                        page === '...' ? 'cursor-default' : ''
                      }`}
                      disabled={notificationCurrentPage === page || page === '...'}
                      key={`${page}-${index}`}
                      onClick={() => typeof page === 'number' && notificationGoToPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="page-btn"
                  disabled={notificationCurrentPage === notificationTotalPages}
                  onClick={notificationNextPage}
                  type="button"
                >
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>

              <div className="page-size">
                <select
                  className="page-select"
                  onChange={(event) => {
                    setNotificationPageSize(Number(event.target.value))
                    setNotificationCurrentPage(1)
                  }}
                  value={notificationPageSize}
                >
                  <option value={5}>5条/页</option>
                  <option value={10}>10条/页</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showCreateNotificationModal ? (
        <div className="modal-overlay open" onClick={() => setShowCreateNotificationModal(false)} role="presentation">
          <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3 className="modal-title">{isEditingNotification ? '编辑通知' : '发送通知'}</h3>
              <button className="modal-close" onClick={() => setShowCreateNotificationModal(false)} type="button">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">通知标题</label>
                <input
                  className="form-input"
                  onChange={(event) => setNewNotification((current) => ({ ...current, title: event.target.value }))}
                  placeholder="请输入通知标题"
                  type="text"
                  value={newNotification.title}
                />
              </div>
              <div className="form-group">
                <label className="form-label">通知内容</label>
                <textarea
                  className="form-input"
                  onChange={(event) => setNewNotification((current) => ({ ...current, content: event.target.value }))}
                  placeholder="请输入通知内容"
                  rows={4}
                  value={newNotification.content}
                />
              </div>
              <div className="form-group">
                <label className="form-label">通知类型</label>
                <div className="input-wrapper">
                  <select
                    className="form-select"
                    onChange={(event) => setNewNotification((current) => ({ ...current, type: event.target.value }))}
                    value={newNotification.type}
                  >
                    <option value="system">系统通知</option>
                    <option value="activity">活动通知</option>
                  </select>
                  <i className="ri-arrow-down-s-line select-arrow" />
                </div>
              </div>
              {isAdmin ? (
                <div className="form-group">
                  <label className="form-label">发送对象</label>
                  <div className="input-wrapper">
                    <select
                      className="form-select"
                      onChange={(event) =>
                        setNewNotification((current) => ({
                          ...current,
                          target_user_id: Number(event.target.value),
                        }))
                      }
                      value={newNotification.target_user_id}
                    >
                      <option value={0}>全员通知</option>
                      {targetUsers.map((targetUser) => (
                        <option key={targetUser.id} value={targetUser.id}>
                          {targetUser.name} ({targetUser.username})
                        </option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line select-arrow" />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateNotificationModal(false)} type="button">
                取消
              </button>
              <button
                className="btn btn-primary"
                disabled={creatingNotification}
                onClick={() => void (isEditingNotification ? handleUpdateNotification() : handleCreateNotification())}
                type="button"
              >
                {creatingNotification ? '提交中...' : isEditingNotification ? '更新' : '发送'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setShowNotificationDetailModal(false)}
        open={showNotificationDetailModal}
      />
    </div>
  )
}
