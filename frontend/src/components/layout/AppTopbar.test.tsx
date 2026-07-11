import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { notificationApi } from '@/api/notification'
import { useAuthStore } from '@/stores/auth'
import { render, screen, waitFor } from '@/test/render'
import AppTopbar from './AppTopbar'

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
    useAuthStore.setState({ isAuthenticated: false, isLoggedIn: false, token: null, user: null })
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
    expect(screen.getByRole('button', { name: '打开命令入口' })).toHaveTextContent('K')
    expect(screen.getByRole('button', { name: '查看通知' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '切换主题' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开用户菜单' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: '查看通知' }))
    await waitFor(() => expect(screen.getByText('项目已更新')).toBeInTheDocument())
    await user.click(screen.getByText('项目已更新'))

    const dialog = screen.getByRole('dialog', { name: '通知详情' })
    expect(container.querySelector('.app-topbar')).not.toContainElement(dialog)
    expect(dialog.closest('.app-topbar-portal')).toBeInTheDocument()
  })
})
