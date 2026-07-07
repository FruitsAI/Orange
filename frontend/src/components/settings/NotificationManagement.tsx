import { FormEvent, useCallback, useEffect, useState } from 'react'
import { notificationApi, type Notification } from '@/api/notification'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

export default function NotificationManagement() {
  const toast = useToastStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationApi.list(1, 20)
      setNotifications(response.data.data.list)
    } catch {
      toast.error('获取通知失败')
    }
  }, [toast])

  useEffect(() => {
    const timer = window.setTimeout(loadNotifications, 0)
    return () => window.clearTimeout(timer)
  }, [loadNotifications])

  const createNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await notificationApi.create({ content, title, type: '1' })
      setTitle('')
      setContent('')
      toast.success('通知已发送')
      await loadNotifications()
    } catch {
      toast.error('发送通知失败')
    }
  }

  return (
    <GlassCard>
      <form className="form-grid" onSubmit={createNotification}>
        <div className="form-field">
          <label>标题</label>
          <input onChange={(event) => setTitle(event.target.value)} required value={title} />
        </div>
        <div className="form-field form-field-wide">
          <label>内容</label>
          <textarea onChange={(event) => setContent(event.target.value)} required value={content} />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            发送通知
          </button>
        </div>
      </form>
      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>类型</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id}>
                <td>{notification.title}</td>
                <td>{notification.type === 2 ? '活动' : notification.type === 3 ? '私信' : '系统'}</td>
                <td>{new Date(notification.create_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
