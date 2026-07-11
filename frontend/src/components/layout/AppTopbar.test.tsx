import { beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@/test/render'
import { render } from '@/test/render'
import AppTopbar from './AppTopbar'

vi.mock('@/api/notification', () => ({
  notificationApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ data: { data: { count: 0 } } }),
    list: vi.fn().mockResolvedValue({ data: { data: { list: [] } } }),
    markAsRead: vi.fn().mockResolvedValue({ data: { data: null } }),
  },
}))

vi.mock('@/components/notification/NotificationDetailModal', () => ({
  default: () => null,
}))

describe('AppTopbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
