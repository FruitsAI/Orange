import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { notificationApi, type Notification } from '@/api/notification'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const titleByPath: Array<[RegExp, string]> = [
  [/^\/dashboard/, '工作台'],
  [/^\/projects\/create/, '新建项目'],
  [/^\/projects\/edit/, '编辑项目'],
  [/^\/projects/, '项目管理'],
  [/^\/payment|\/payment\//, '收款管理'],
  [/^\/calendar/, '收款日历'],
  [/^\/analytics/, '数据分析'],
  [/^\/settings/, '系统设置'],
]

const getNotificationTypeName = (type: number) => {
  if (type === 2) return '活动'
  if (type === 3) return '私信'
  return '系统'
}

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const pageTitle = useMemo(() => {
    return titleByPath.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? '工作台'
  }, [location.pathname])

  const userInitial = (user?.name || user?.username || 'U').charAt(0).toUpperCase()

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const [countRes, listRes] = await Promise.all([
        notificationApi.getUnreadCount(),
        notificationApi.list(1, 5),
      ])
      setUnreadCount(countRes.data.data.count)
      setRecentNotifications(listRes.data.data.list)
    } catch {
      // Notification polling should never break primary navigation.
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    window.setTimeout(refreshNotifications, 0)
    const interval = window.setInterval(refreshNotifications, 30000)
    return () => window.clearInterval(interval)
  }, [isAuthenticated, refreshNotifications])

  const handleNotificationClick = async (item: Notification) => {
    setShowNotifications(false)
    setSelectedNotification(item)
    if (!item.is_read) {
      try {
        await notificationApi.markAsRead(item.id)
        setUnreadCount((count) => Math.max(0, count - 1))
        setRecentNotifications((items) =>
          items.map((notification) =>
            notification.id === item.id ? { ...notification, is_read: true } : notification,
          ),
        )
      } catch {
        // Keep showing the detail even if the read marker fails.
      }
    }
  }

  const handleLogout = async () => {
    setShowUserMenu(false)
    await logout()
    await navigate('/login')
  }

  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{pageTitle}</h1>
      </div>
      <div className="page-actions">
        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title="切换主题" type="button">
          <i className={effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'} />
        </button>

        <div className="notification-wrapper relative">
          <button
            className="btn btn-ghost btn-icon relative"
            onClick={() => {
              setShowNotifications((value) => !value)
              setShowUserMenu(false)
              refreshNotifications()
            }}
            title="通知"
            type="button"
          >
            <i className="ri-notification-3-line" />
            {unreadCount > 0 ? <span className="notification-dot" /> : null}
          </button>

          {showNotifications ? (
            <>
              <div className="notification-dropdown">
                <div className="dropdown-header">
                  <span className="font-medium">最近通知</span>
                  <button
                    className="text-xs text-primary cursor-pointer hover:underline"
                    onClick={() => {
                      setShowNotifications(false)
                      navigate('/settings?tab=notification')
                    }}
                    type="button"
                  >
                    查看全部
                  </button>
                </div>
                <div className="dropdown-list">
                  {recentNotifications.length === 0 ? (
                    <div className="empty-state">暂无通知</div>
                  ) : (
                    recentNotifications.map((item) => (
                      <button
                        className="dropdown-item"
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        type="button"
                      >
                        <div className="item-title truncate flex items-center gap-2">
                          {!item.is_read ? <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> : null}
                          <span className={`notification-type-badge type-${item.type}`}>
                            {getNotificationTypeName(item.type)}
                          </span>
                          <span className={item.is_read ? 'read-title' : 'unread-title'}>
                            {item.title}
                          </span>
                        </div>
                        <div className="item-time">{new Date(item.create_time).toLocaleDateString()}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <button
                aria-label="关闭通知菜单"
                className="menu-overlay"
                onClick={() => setShowNotifications(false)}
                type="button"
              />
            </>
          ) : null}
        </div>

        <div className="user-menu-wrapper">
          <button
            className="user-avatar-btn"
            onClick={() => {
              setShowUserMenu((value) => !value)
              setShowNotifications(false)
            }}
            title="用户菜单"
            type="button"
          >
            <svg className="user-avatar-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="headerAvatarGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FF8A00' }} />
                  <stop offset="100%" style={{ stopColor: '#FF5C00' }} />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" fill="url(#headerAvatarGradient)" r="50" />
              <text
                dominantBaseline="central"
                fill="white"
                fontSize="40"
                fontWeight="600"
                textAnchor="middle"
                x="50"
                y="50"
              >
                {userInitial}
              </text>
            </svg>
          </button>

          {showUserMenu ? (
            <>
              <div className="user-dropdown">
                <button className="user-dropdown-item" onClick={() => navigate('/settings')} type="button">
                  <i className="ri-user-line" />
                  <span>个人信息</span>
                </button>
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item logout" onClick={handleLogout} type="button">
                  <i className="ri-logout-box-r-line" />
                  <span>退出登录</span>
                </button>
              </div>
              <button
                aria-label="关闭用户菜单"
                className="user-menu-overlay"
                onClick={() => setShowUserMenu(false)}
                type="button"
              />
            </>
          ) : null}
        </div>
      </div>
      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        open={Boolean(selectedNotification)}
      />
    </header>
  )
}
