import userEvent from '@testing-library/user-event'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useNavigate } from 'react-router-dom'
import { notificationApi, type Notification } from '@/api/notification'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { fireEvent, render, screen, waitFor } from '@/test/render'
import AppTopbar from './AppTopbar'
import '@/styles/layout.css'

const { toggleMaximise } = vi.hoisted(() => ({
  toggleMaximise: vi.fn().mockResolvedValue(undefined),
}))

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

const unreadNotification: Notification = {
  content: '项目进度发生变化',
  create_time: '2026-07-11T10:00:00Z',
  id: 7,
  is_global: 1,
  is_read: false,
  sender_id: 1,
  title: '项目已更新',
  type: 2,
}

vi.mock('@wailsio/runtime', () => ({
  Window: { ToggleMaximise: toggleMaximise },
}))

vi.mock('@/api/notification', () => ({
  notificationApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ data: { data: { count: 0 } } }),
    list: vi.fn().mockResolvedValue({ data: { data: { list: [] } } }),
    markAsRead: vi.fn().mockResolvedValue({ data: { data: null } }),
  },
}))

describe('AppTopbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({
      data: { data: { count: 0 } },
    } as never)
    vi.mocked(notificationApi.list).mockResolvedValue({
      data: { data: { list: [] } },
    } as never)
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({ data: { data: null } } as never)
    useAuthStore.setState({ isAuthenticated: false, isLoggedIn: false, token: null, user: null })
    window.localStorage.clear()
    useThemeStore.setState({ effectiveTheme: 'light', theme: 'auto' })
  })

  afterEach(() => {
    useAuthStore.setState({ isAuthenticated: false, isLoggedIn: false, token: null, user: null })
  })

  test('renders the Orange brand and primary navigation', () => {
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    const topbar = screen.getByRole('banner')
    const primaryNavigation = screen.getByRole('navigation', { name: '主导航' })
    expect(topbar).toHaveClass('ods-surface')
    expect(topbar).toHaveAttribute('data-radius', 'shell')
    expect(topbar).toHaveAttribute('data-variant', 'glass')
    expect(primaryNavigation).toHaveClass('ods-surface')
    expect(primaryNavigation).toHaveAttribute('data-radius', 'pill')
    expect(primaryNavigation).toHaveAttribute('data-variant', 'inset')
    expect(screen.getByRole('img', { name: 'Orange Logo' }).parentElement).toHaveAttribute(
      'data-fit',
      'contain',
    )
    expect(screen.getByText('Orange')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '工作台' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: '项目管理' })).toHaveAttribute('href', '/projects')
    expect(screen.getByRole('link', { name: '收款日历' })).toHaveAttribute('href', '/calendar')
    expect(screen.getByRole('link', { name: '数据分析' })).toHaveAttribute('href', '/analytics')
  })

  test('marks only the matching primary route as the current page', () => {
    render(<AppTopbar />, { initialEntries: ['/projects/42'] })

    expect(screen.getByRole('link', { name: '项目管理' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '工作台' })).not.toHaveAttribute('aria-current')
  })

  test('keeps settings and accessible utility controls outside primary navigation', () => {
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    const primaryNavigation = screen.getByRole('navigation', { name: '主导航' })
    expect(primaryNavigation).not.toContainElement(screen.getByRole('link', { name: '系统设置' }))
    expect(screen.getByRole('link', { name: '系统设置' })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: '系统设置' })).toHaveClass(
      'ods-button',
      'ods-icon-button',
    )
    expect(screen.getByRole('button', { name: '命令入口即将推出' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '命令入口即将推出' })).toHaveAttribute(
      'title',
      '命令入口即将推出',
    )
    expect(screen.getByRole('button', { name: '查看通知' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /主题：跟随系统/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开用户菜单' })).toBeInTheDocument()
    for (const control of [
      screen.getByRole('link', { name: '系统设置' }),
      screen.getByRole('button', { name: '命令入口即将推出' }),
      screen.getByRole('button', { name: '查看通知' }),
      screen.getByRole('button', { name: /主题：跟随系统/ }),
      screen.getByRole('button', { name: '打开用户菜单' }),
    ]) {
      expect(control).toHaveAttribute('data-variant', 'secondary')
    }
  })

  test('provides a dedicated notification anchor for compact-window positioning', () => {
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    expect(screen.getByRole('button', { name: '查看通知' }).parentElement).toHaveClass(
      'app-topbar__notification-wrapper',
    )
  })

  test('uses the shared window action for draggable topbar gaps but not interactive controls', () => {
    const { container } = render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    fireEvent.doubleClick(screen.getByRole('banner'))
    fireEvent.doubleClick(screen.getByRole('navigation', { name: '主导航' }))
    fireEvent.doubleClick(container.querySelector('.app-topbar__utilities')!)
    expect(toggleMaximise).toHaveBeenCalledTimes(3)

    fireEvent.doubleClick(screen.getByRole('button', { name: /主题：跟随系统/ }))
    fireEvent.doubleClick(screen.getByRole('link', { name: '项目管理' }))
    expect(toggleMaximise).toHaveBeenCalledTimes(3)
  })

  test('closes the user menu after its navigation action', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    await user.click(screen.getByRole('button', { name: '打开用户菜单' }))
    expect(screen.getByRole('button', { name: '个人信息' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '个人信息' }))

    expect(screen.queryByRole('button', { name: '个人信息' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '用户菜单' })).not.toBeInTheDocument()
  })

  test('uses the shared danger tone for the logout action', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    await user.click(screen.getByRole('button', { name: '打开用户菜单' }))
    const logoutAction = screen.getByRole('button', { name: '退出登录' })

    expect(logoutAction).toHaveAttribute('data-tone', 'danger')
    expect(logoutAction).not.toHaveClass('is-danger')
  })

  test('keeps theme, notification, and user menus mutually exclusive', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    await user.click(screen.getByRole('button', { name: '打开用户菜单' }))
    expect(screen.getByRole('button', { name: '个人信息' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))
    expect(screen.queryByRole('button', { name: '个人信息' })).not.toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: '主题模式' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看通知' }))
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '最近通知' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))
    await user.click(screen.getByRole('button', { name: '打开用户菜单' }))
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '个人信息' })).toBeInTheDocument()
  })

  test('exposes notification and user dropdowns as controlled popovers, not ARIA menus', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })
    const notificationTrigger = screen.getByRole('button', { name: '查看通知' })

    await user.click(notificationTrigger)
    const notificationPopover = screen.getByRole('region', { name: '最近通知' })
    expect(notificationTrigger).toHaveAttribute('aria-controls', notificationPopover.id)
    expect(notificationPopover.parentElement).toBe(document.body)
    expect(notificationPopover).toHaveAttribute('data-padding', 'none')
    expect(screen.getByText('暂无通知').closest('.ods-empty-state')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()

    const userTrigger = screen.getByRole('button', { name: '打开用户菜单' })
    await user.click(userTrigger)
    const userPopover = screen.getByRole('region', { name: '用户菜单' })
    expect(userTrigger).toHaveAttribute('aria-controls', userPopover.id)
    expect(userPopover.parentElement).toBe(document.body)
    expect(screen.getByRole('separator')).toHaveClass('ods-divider')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  test('closes the notification menu on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })
    const trigger = screen.getByRole('button', { name: '查看通知' })

    await user.click(trigger)
    expect(screen.getByRole('region', { name: '最近通知' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('region', { name: '最近通知' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('closes the user menu on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })
    const trigger = screen.getByRole('button', { name: '打开用户菜单' })

    await user.click(trigger)
    expect(screen.getByRole('button', { name: '个人信息' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('button', { name: '个人信息' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('closes open menus when the current location changes', async () => {
    function LocationDriver() {
      const navigate = useNavigate()
      return (
        <button onClick={() => navigate('/dashboard?period=month')} type="button">
          改变位置
        </button>
      )
    }

    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      isLoggedIn: true,
      token: 'test-token',
      user: { id: 1, username: 'tester', name: '测试用户' } as never,
    })
    render(
      <>
        <AppTopbar />
        <LocationDriver />
      </>,
      { initialEntries: ['/dashboard'] },
    )

    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: '查看通知' }))
    expect(screen.getByRole('region', { name: '最近通知' })).toBeInTheDocument()
    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(2))
    const locationButton = screen.getByRole('button', { name: '改变位置' })
    await user.click(locationButton)

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: '最近通知' })).not.toBeInTheDocument(),
    )
    expect(notificationApi.list).toHaveBeenCalledTimes(2)
    expect(notificationApi.getUnreadCount).toHaveBeenCalledTimes(2)
    expect(locationButton).toHaveFocus()
  })

  test('portals menus outside the draggable topbar and dismisses them on outside pointer press', async () => {
    const user = userEvent.setup()
    const { container } = render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    await user.click(screen.getByRole('button', { name: '查看通知' }))

    const popover = screen.getByRole('region', { name: '最近通知' })
    expect(container.querySelector('.app-topbar')).not.toContainElement(popover)
    expect(popover.parentElement).toBe(document.body)

    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('region', { name: '最近通知' })).not.toBeInTheDocument()
  })

  test('portals notification details outside the draggable topbar', async () => {
    const user = userEvent.setup()
    vi.mocked(notificationApi.list).mockResolvedValue({
      data: {
        data: {
          list: [
            {
              id: 7,
              title: '项目已更新',
              content: '项目进度发生变化',
              type: 2,
              sender_id: 1,
              is_global: 1,
              is_read: true,
              create_time: '2026-07-11T10:00:00Z',
            },
          ],
        },
      },
    } as never)
    useAuthStore.setState({
      isAuthenticated: true,
      isLoggedIn: true,
      token: 'test-token',
      user: { id: 1, username: 'tester', name: '测试用户' } as never,
    })
    const { container } = render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    const notificationTrigger = screen.getByRole('button', { name: '查看通知' })
    await user.click(notificationTrigger)
    await waitFor(() => expect(screen.getByText('项目已更新')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /项目已更新/ })).toHaveAttribute(
      'data-auto-height',
      'true',
    )
    await user.click(screen.getByText('项目已更新'))

    const dialog = screen.getByRole('dialog', { name: '通知详情' })
    expect(container.querySelector('.app-topbar')).not.toContainElement(dialog)
    expect(dialog.closest('.app-topbar-portal')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '通知详情' })).not.toBeInTheDocument()
    expect(notificationTrigger).toHaveFocus()
  })

  test('does not let an older refresh restore unread state after marking a notification as read', async () => {
    const user = userEvent.setup()
    const staleCount = createDeferred<Awaited<ReturnType<typeof notificationApi.getUnreadCount>>>()
    const staleList = createDeferred<Awaited<ReturnType<typeof notificationApi.list>>>()
    const markAsRead = createDeferred<Awaited<ReturnType<typeof notificationApi.markAsRead>>>()

    vi.mocked(notificationApi.getUnreadCount)
      .mockResolvedValueOnce({ data: { data: { count: 1 } } } as never)
      .mockReturnValueOnce(staleCount.promise)
    vi.mocked(notificationApi.list)
      .mockResolvedValueOnce({ data: { data: { list: [unreadNotification] } } } as never)
      .mockReturnValueOnce(staleList.promise)
    vi.mocked(notificationApi.markAsRead).mockReturnValueOnce(markAsRead.promise)
    useAuthStore.setState({
      isAuthenticated: true,
      isLoggedIn: true,
      token: 'test-token',
      user: { id: 1, username: 'tester', name: '测试用户' } as never,
    })

    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    const trigger = screen.getByRole('button', { name: '查看通知' })
    const unreadMark = trigger.querySelector('[data-slot="mark"]')
    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(unreadMark).not.toHaveAttribute('data-invisible'))

    await user.click(trigger)
    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(2))
    await user.click(screen.getByText('项目已更新'))

    await act(async () => {
      markAsRead.resolve({ data: { data: null } } as never)
      await markAsRead.promise
    })
    await waitFor(() => expect(unreadMark).toHaveAttribute('data-invisible', 'true'))

    await act(async () => {
      staleCount.resolve({ data: { data: { count: 1 } } } as never)
      staleList.resolve({ data: { data: { list: [unreadNotification] } } } as never)
      await Promise.all([staleCount.promise, staleList.promise])
    })

    expect(unreadMark).toHaveAttribute('data-invisible', 'true')
  })
})
