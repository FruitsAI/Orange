import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '@/api/notification'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { fireEvent, render, screen, waitFor } from '@/test/render'
import AppTopbar from './AppTopbar'
import '@/styles/layout.css'

const { toggleMaximise } = vi.hoisted(() => ({
  toggleMaximise: vi.fn().mockResolvedValue(undefined),
}))

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

    expect(screen.getByRole('img', { name: 'Orange Logo' })).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: '命令入口即将推出' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '命令入口即将推出' })).toHaveAttribute(
      'title',
      '命令入口即将推出',
    )
    expect(screen.getByRole('button', { name: '查看通知' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /主题：跟随系统/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开用户菜单' })).toBeInTheDocument()
  })

  test('provides a dedicated notification anchor for compact-window positioning', () => {
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    expect(screen.getByRole('button', { name: '查看通知' }).parentElement).toHaveClass(
      'app-topbar__notification-wrapper',
    )
  })

  test('maximises draggable topbar gaps but not interactive controls', () => {
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
    expect(screen.getByRole('menuitem', { name: '个人信息' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: '个人信息' }))

    expect(screen.queryByRole('menuitem', { name: '个人信息' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '关闭用户菜单' })).not.toBeInTheDocument()
  })

  test('keeps theme, notification, and user menus mutually exclusive', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    await user.click(screen.getByRole('button', { name: '打开用户菜单' }))
    expect(screen.getByRole('menuitem', { name: '个人信息' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))
    expect(screen.queryByRole('menuitem', { name: '个人信息' })).not.toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: '主题模式' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看通知' }))
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭通知菜单' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))
    await user.click(screen.getByRole('button', { name: '打开用户菜单' }))
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '个人信息' })).toBeInTheDocument()
  })

  test('closes the notification menu on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })
    const trigger = screen.getByRole('button', { name: '查看通知' })

    await user.click(trigger)
    expect(screen.getByRole('button', { name: '关闭通知菜单' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('button', { name: '关闭通知菜单' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('closes the user menu on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<AppTopbar />, { initialEntries: ['/dashboard'] })
    const trigger = screen.getByRole('button', { name: '打开用户菜单' })

    await user.click(trigger)
    expect(screen.getByRole('menuitem', { name: '个人信息' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menuitem', { name: '个人信息' })).not.toBeInTheDocument()
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
    expect(screen.getByRole('menu', { name: '' })).toBeInTheDocument()
    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(2))
    const locationButton = screen.getByRole('button', { name: '改变位置' })
    await user.click(locationButton)

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '关闭通知菜单' })).not.toBeInTheDocument(),
    )
    expect(notificationApi.list).toHaveBeenCalledTimes(2)
    expect(notificationApi.getUnreadCount).toHaveBeenCalledTimes(2)
    expect(locationButton).toHaveFocus()
  })

  test('portals the full-window menu overlay outside the draggable topbar', async () => {
    const user = userEvent.setup()
    const { container } = render(<AppTopbar />, { initialEntries: ['/dashboard'] })

    await user.click(screen.getByRole('button', { name: '查看通知' }))

    const overlay = screen.getByRole('button', { name: '关闭通知菜单' })
    expect(container.querySelector('.app-topbar')).not.toContainElement(overlay)
    expect(overlay.parentElement).toBe(document.body)
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
    await user.click(screen.getByText('项目已更新'))

    const dialog = screen.getByRole('dialog', { name: '通知详情' })
    expect(container.querySelector('.app-topbar')).not.toContainElement(dialog)
    expect(dialog.closest('.app-topbar-portal')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '通知详情' })).not.toBeInTheDocument()
    expect(notificationTrigger).toHaveFocus()
  })
})
