import { useId } from 'react'
import { createPortal } from 'react-dom'
import type { Notification } from '@/api/notification'

interface NotificationDetailModalProps {
  open: boolean
  notification: Notification | null
  onClose: () => void
}

const getTypeName = (type?: number) => {
  if (type === 2) return '活动'
  if (type === 3) return '私信'
  return '系统'
}

export default function NotificationDetailModal({
  open,
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const titleId = useId()

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="app-topbar-portal modal-overlay open" onClick={onClose} role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal open"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <h3 className="modal-title" id={titleId}>
            通知详情
          </h3>
          <button aria-label="关闭通知详情" className="modal-close" onClick={onClose} type="button">
            <i className="ri-close-line" />
          </button>
        </div>
        {notification ? (
          <div className="modal-body">
            <div className="notification-detail-header mb-md flex items-center gap-md">
              <span className={`notification-type-badge type-${notification.type}`}>
                {getTypeName(notification.type)}
              </span>
              <span className="text-sm text-secondary">
                {notification.is_global === 1 ? '全员通知' : '私信通知'}
              </span>
            </div>
            <h4 className="text-xl font-medium mb-md">{notification.title}</h4>
            <div className="content-wrapper mb-lg">
              <p className="text-secondary whitespace-pre-wrap">{notification.content}</p>
            </div>
            <div className="text-sm text-tertiary">
              {new Date(notification.create_time).toLocaleString()}
              {notification.sender ? ` · 发送者: ${notification.sender.name}` : ''}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
