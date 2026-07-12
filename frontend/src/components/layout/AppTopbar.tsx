import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Window } from '@wailsio/runtime'
import { notificationApi, type Notification } from '@/api/notification'
import ThemeSelector from '@/components/common/ThemeSelector'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal'
import { useAuthStore } from '@/stores/auth'
import { primaryNavigationItems } from './primaryNavigation'

const getNotificationTypeName = (type: number) => {
  if (type === 2) return '活动'
  if (type === 3) return '私信'
  return '系统'
}

interface AppTopbarProps {
  scrolled?: boolean
}

export default function AppTopbar({ scrolled = false }: AppTopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const [activeMenu, setActiveMenu] = useState<'notifications' | 'theme' | 'user' | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const userInitial = (user?.name || user?.username || 'U').charAt(0).toUpperCase()
  const closeMenus = useCallback(() => {
    setActiveMenu(null)
  }, [])
  const showNotifications = activeMenu === 'notifications'
  const showUserMenu = activeMenu === 'user'

  useEffect(() => {
    // Route changes are an external navigation event that invalidates open anchored menus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeMenus()
  }, [closeMenus, location.pathname, location.search])

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
    const initialRefresh = window.setTimeout(refreshNotifications, 0)
    const interval = window.setInterval(refreshNotifications, 30000)
    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(interval)
    }
  }, [isAuthenticated, refreshNotifications])

  const handleNotificationClick = async (item: Notification) => {
    closeMenus()
    setSelectedNotification(item)
    if (item.is_read) return

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

  const handleLogout = async () => {
    closeMenus()
    await logout()
    await navigate('/login')
  }

  const handleTopbarDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (
      target.closest(
        'a, button, input, select, textarea, [role="menu"], [role="menuitem"], [role="dialog"]',
      )
    )
      return
    if (window.getComputedStyle(target).getPropertyValue('--wails-draggable').trim() !== 'drag')
      return

    try {
      void Window.ToggleMaximise().catch(() => {})
    } catch {
      // The browser preview has no native Wails window transport.
    }
  }

  return (
    <header
      className="app-topbar"
      data-scrolled={scrolled || undefined}
      onDoubleClick={handleTopbarDoubleClick}
    >
      <NavLink
        aria-label="Orange 工作台"
        className="app-topbar__brand"
        onClick={closeMenus}
        to="/dashboard"
      >
        <img alt="Orange Logo" src="/orange.png" />
        <span>Orange</span>
      </NavLink>

      <nav aria-label="主导航" className="app-topbar__nav">
        {primaryNavigationItems.map((item) => (
          <NavLink
            className="app-topbar__nav-link"
            key={item.path}
            onClick={closeMenus}
            to={item.path}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="app-topbar__utilities">
        <button
          aria-label="命令入口即将推出"
          className="app-topbar__command"
          disabled
          title="命令入口即将推出"
          type="button"
        >
          <i aria-hidden="true" className="ri-search-line" />
          <span>⌘ K</span>
        </button>

        <ThemeSelector
          onBeforeOpen={closeMenus}
          onOpenChange={(open) => setActiveMenu(open ? 'theme' : null)}
          open={activeMenu === 'theme'}
        />

        <div className="app-topbar__menu-wrapper app-topbar__notification-wrapper">
          <button
            aria-expanded={showNotifications}
            aria-label="查看通知"
            className="app-topbar__icon-button"
            onClick={() => {
              setActiveMenu(showNotifications ? null : 'notifications')
              refreshNotifications()
            }}
            type="button"
          >
            <i aria-hidden="true" className="ri-notification-3-line" />
            {unreadCount > 0 ? <span className="app-topbar__notification-dot" /> : null}
          </button>

          {showNotifications ? (
            <>
              <div className="app-topbar__dropdown app-topbar__notification-menu" role="menu">
                <div className="app-topbar__dropdown-header">
                  <span>最近通知</span>
                  <button
                    onClick={() => {
                      closeMenus()
                      navigate('/settings?tab=notification')
                    }}
                    type="button"
                  >
                    查看全部
                  </button>
                </div>
                <div className="app-topbar__notification-list">
                  {recentNotifications.length === 0 ? (
                    <div className="app-topbar__empty">暂无通知</div>
                  ) : (
                    recentNotifications.map((item) => (
                      <button
                        className="app-topbar__notification-item"
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        role="menuitem"
                        type="button"
                      >
                        <span className="app-topbar__notification-title">
                          {!item.is_read ? <span className="app-topbar__unread-dot" /> : null}
                          <span className={`notification-type-badge type-${item.type}`}>
                            {getNotificationTypeName(item.type)}
                          </span>
                          <span className={item.is_read ? 'read-title' : 'unread-title'}>
                            {item.title}
                          </span>
                        </span>
                        <span className="app-topbar__notification-time">
                          {new Date(item.create_time).toLocaleDateString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              {typeof document !== 'undefined'
                ? createPortal(
                    <button
                      aria-label="关闭通知菜单"
                      className="app-topbar__overlay"
                      onClick={closeMenus}
                      type="button"
                    />,
                    document.body,
                  )
                : null}
            </>
          ) : null}
        </div>

        <NavLink
          aria-label="系统设置"
          className="app-topbar__icon-button"
          onClick={closeMenus}
          to="/settings"
        >
          <i aria-hidden="true" className="ri-settings-4-line" />
        </NavLink>

        <div className="app-topbar__menu-wrapper">
          <button
            aria-expanded={showUserMenu}
            aria-label="打开用户菜单"
            className="app-topbar__user-button"
            onClick={() => {
              setActiveMenu(showUserMenu ? null : 'user')
            }}
            type="button"
          >
            <span aria-hidden="true" className="app-topbar__avatar">
              {userInitial}
            </span>
            <span className="app-topbar__user-name">{user?.name || user?.username || '用户'}</span>
            <i aria-hidden="true" className="ri-arrow-down-s-line" />
          </button>

          {showUserMenu ? (
            <>
              <div className="app-topbar__dropdown app-topbar__user-menu" role="menu">
                <button
                  onClick={() => {
                    closeMenus()
                    navigate('/settings')
                  }}
                  role="menuitem"
                  type="button"
                >
                  <i aria-hidden="true" className="ri-user-line" />
                  <span>个人信息</span>
                </button>
                <div className="app-topbar__dropdown-divider" />
                <button className="is-danger" onClick={handleLogout} role="menuitem" type="button">
                  <i aria-hidden="true" className="ri-logout-box-r-line" />
                  <span>退出登录</span>
                </button>
              </div>
              {typeof document !== 'undefined'
                ? createPortal(
                    <button
                      aria-label="关闭用户菜单"
                      className="app-topbar__overlay"
                      onClick={closeMenus}
                      type="button"
                    />,
                    document.body,
                  )
                : null}
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
