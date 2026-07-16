import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { notificationApi, type Notification } from '@/api/notification'
import ThemeSelector from '@/components/common/ThemeSelector'
import NotificationDetailModal from '@/components/notification/NotificationDetailModal'
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Divider,
  EmptyState,
  Image,
  IconButton,
  Popover,
  RouterIconButton,
  RouterLink,
  RouterNavLink,
  Surface,
  type ChipTone,
} from '@/design-system'
import { useAuthStore } from '@/stores/auth'
import { primaryNavigationItems } from './primaryNavigation'
import { handleWindowDragRegionDoubleClick } from './windowDrag'

const getNotificationTypeName = (type: number) => {
  if (type === 2) return '活动'
  if (type === 3) return '私信'
  return '系统'
}

const getNotificationTone = (type: number): ChipTone => {
  if (type === 2) return 'accent'
  if (type === 3) return 'info'
  return 'neutral'
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
  const notificationTriggerRef = useRef<HTMLButtonElement>(null)
  const isAuthenticatedRef = useRef(isAuthenticated)
  const isMountedRef = useRef(false)
  const notificationRefreshGenerationRef = useRef(0)
  const notificationSessionGenerationRef = useRef(0)
  const pendingReadMutationsRef = useRef(0)

  const userInitial = (user?.name || user?.username || 'U').charAt(0).toUpperCase()
  const closeMenus = useCallback(() => {
    setActiveMenu(null)
  }, [])
  const showNotifications = activeMenu === 'notifications'
  const showUserMenu = activeMenu === 'user'

  useLayoutEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      notificationRefreshGenerationRef.current += 1
      notificationSessionGenerationRef.current += 1
    }
  }, [])

  useEffect(() => {
    // Route changes are an external navigation event that invalidates open anchored menus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeMenus()
  }, [closeMenus, location.pathname, location.search])

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticatedRef.current || pendingReadMutationsRef.current > 0) return

    const refreshGeneration = ++notificationRefreshGenerationRef.current
    const sessionGeneration = notificationSessionGenerationRef.current

    try {
      const [countRes, listRes] = await Promise.all([
        notificationApi.getUnreadCount(),
        notificationApi.list(1, 5),
      ])
      if (
        !isMountedRef.current ||
        !isAuthenticatedRef.current ||
        pendingReadMutationsRef.current > 0 ||
        refreshGeneration !== notificationRefreshGenerationRef.current ||
        sessionGeneration !== notificationSessionGenerationRef.current
      ) {
        return
      }
      setUnreadCount(countRes.data.data.count)
      setRecentNotifications(listRes.data.data.list)
    } catch {
      // Notification polling should never break primary navigation.
    }
  }, [])

  useEffect(() => {
    notificationRefreshGenerationRef.current += 1
    notificationSessionGenerationRef.current += 1
    pendingReadMutationsRef.current = 0
    if (!isAuthenticated) return

    const initialRefresh = window.setTimeout(refreshNotifications, 0)
    const interval = window.setInterval(refreshNotifications, 30000)
    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(interval)
      notificationRefreshGenerationRef.current += 1
      notificationSessionGenerationRef.current += 1
      pendingReadMutationsRef.current = 0
    }
  }, [isAuthenticated, refreshNotifications])

  const handleNotificationClick = async (item: Notification) => {
    closeMenus()
    notificationTriggerRef.current?.focus()
    setSelectedNotification(item)
    if (item.is_read) return

    const sessionGeneration = notificationSessionGenerationRef.current
    pendingReadMutationsRef.current += 1
    notificationRefreshGenerationRef.current += 1

    try {
      await notificationApi.markAsRead(item.id)
      if (
        !isMountedRef.current ||
        !isAuthenticatedRef.current ||
        sessionGeneration !== notificationSessionGenerationRef.current
      ) {
        return
      }

      notificationRefreshGenerationRef.current += 1
      setUnreadCount((count) => Math.max(0, count - 1))
      setRecentNotifications((items) =>
        items.map((notification) =>
          notification.id === item.id ? { ...notification, is_read: true } : notification,
        ),
      )
    } catch {
      // Keep showing the detail even if the read marker fails.
    } finally {
      if (sessionGeneration === notificationSessionGenerationRef.current) {
        pendingReadMutationsRef.current = Math.max(0, pendingReadMutationsRef.current - 1)
      }
    }
  }

  const handleLogout = async () => {
    closeMenus()
    await logout()
    await navigate('/login')
  }

  return (
    <Surface
      as="header"
      className="app-topbar"
      data-scrolled={scrolled || undefined}
      onDoubleClick={handleWindowDragRegionDoubleClick}
      padding="none"
      radius="shell"
      variant={scrolled ? 'raised' : 'glass'}
    >
      <RouterLink
        aria-label="Orange 工作台"
        className="app-topbar__brand"
        onClick={closeMenus}
        tone="foreground"
        to="/dashboard"
      >
        <Image
          alt="Orange Logo"
          className="app-topbar__brand-logo"
          fit="contain"
          radius="md"
          showSkeleton={false}
          src="/orange.png"
        />
        <span>Orange</span>
      </RouterLink>

      <Surface
        as="nav"
        aria-label="主导航"
        className="app-topbar__nav"
        padding="none"
        radius="pill"
        variant="inset"
      >
        {primaryNavigationItems.map((item) => (
          <RouterNavLink
            appearance="tab"
            className="app-topbar__nav-link"
            key={item.path}
            onClick={closeMenus}
            to={item.path}
          >
            {item.label}
          </RouterNavLink>
        ))}
      </Surface>

      <div className="app-topbar__utilities">
        <Button
          aria-label="命令入口即将推出"
          className="app-topbar__command"
          disabled
          size="sm"
          title="命令入口即将推出"
          variant="secondary"
        >
          <i aria-hidden="true" className="ri-search-line" />
          <span>⌘ K</span>
        </Button>

        <ThemeSelector
          onBeforeOpen={closeMenus}
          onOpenChange={(open) => setActiveMenu(open ? 'theme' : null)}
          open={activeMenu === 'theme'}
        />

        <Popover.Root
          className="app-topbar__menu-wrapper app-topbar__notification-wrapper"
          onOpenChange={(open) => {
            setActiveMenu(open ? 'notifications' : null)
            if (open) void refreshNotifications()
          }}
          open={showNotifications}
          placement="bottom-end"
        >
          <Popover.Trigger>
            <IconButton
              className="app-topbar__icon-button"
              label="查看通知"
              ref={notificationTriggerRef}
              variant="secondary"
            >
              <Badge dot invisible={unreadCount === 0} tone="danger">
                <i aria-hidden="true" className="ri-notification-3-line" />
              </Badge>
            </IconButton>
          </Popover.Trigger>

          <Popover.Content
            aria-label="最近通知"
            className="app-topbar__popover app-topbar__notification-menu"
            padding="none"
            role="region"
          >
            <div className="app-topbar__dropdown-header">
              <span>最近通知</span>
              <Button
                onClick={() => {
                  closeMenus()
                  navigate('/settings?tab=notification')
                }}
                size="sm"
                variant="ghost"
              >
                查看全部
              </Button>
            </div>
            <Divider />
            <div className="app-topbar__notification-list">
              {recentNotifications.length === 0 ? (
                <EmptyState className="app-topbar__empty" headingLevel={4} title="暂无通知" />
              ) : (
                recentNotifications.map((item, index) => (
                  <Fragment key={item.id}>
                    <Button
                      autoHeight
                      className="app-topbar__notification-item"
                      fullWidth
                      onClick={() => handleNotificationClick(item)}
                      variant="ghost"
                    >
                      <span className="app-topbar__notification-title">
                        <Chip size="sm" tone={getNotificationTone(item.type)}>
                          {getNotificationTypeName(item.type)}
                        </Chip>
                        <span className={item.is_read ? 'read-title' : 'unread-title'}>
                          {item.title}
                        </span>
                      </span>
                      <span className="app-topbar__notification-time">
                        {new Date(item.create_time).toLocaleDateString()}
                      </span>
                    </Button>
                    {index < recentNotifications.length - 1 ? <Divider /> : null}
                  </Fragment>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Root>

        <RouterIconButton
          className="app-topbar__icon-button"
          label="系统设置"
          onClick={closeMenus}
          to="/settings"
          variant="secondary"
        >
          <i aria-hidden="true" className="ri-settings-4-line" />
        </RouterIconButton>

        <Popover.Root
          className="app-topbar__menu-wrapper"
          onOpenChange={(open) => setActiveMenu(open ? 'user' : null)}
          open={showUserMenu}
          placement="bottom-end"
        >
          <Popover.Trigger>
            <Button
              aria-label="打开用户菜单"
              className="app-topbar__user-button"
              variant="secondary"
            >
              <Avatar fallback={userInitial} radius="lg" size="sm" tone="accent" />
              <span className="app-topbar__user-name">
                {user?.name || user?.username || '用户'}
              </span>
              <i aria-hidden="true" className="ri-arrow-down-s-line" />
            </Button>
          </Popover.Trigger>

          <Popover.Content
            aria-label="用户菜单"
            className="app-topbar__popover app-topbar__user-menu"
            role="region"
          >
            <Button
              autoHeight
              className="app-topbar__user-menu-action"
              fullWidth
              onClick={() => {
                closeMenus()
                navigate('/settings')
              }}
              size="sm"
              variant="ghost"
            >
              <i aria-hidden="true" className="ri-user-line" />
              <span>个人信息</span>
            </Button>
            <Divider />
            <Button
              autoHeight
              className="app-topbar__user-menu-action"
              fullWidth
              onClick={handleLogout}
              size="sm"
              tone="danger"
              variant="ghost"
            >
              <i aria-hidden="true" className="ri-logout-box-r-line" />
              <span>退出登录</span>
            </Button>
          </Popover.Content>
        </Popover.Root>
      </div>

      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        open={Boolean(selectedNotification)}
      />
    </Surface>
  )
}
