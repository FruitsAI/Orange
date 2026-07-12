import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi, type DashboardStats, type IncomeTrend } from '@/api/dashboard'
import type { Payment, Project } from '@/api/project'
import { render } from '@/test/render'
import DashboardView from './DashboardView'

vi.mock('@/api/dashboard', () => ({
  dashboardApi: {
    getIncomeTrend: vi.fn(),
    getRecentProjects: vi.fn(),
    getStats: vi.fn(),
    getUpcomingPayments: vi.fn(),
  },
}))

vi.mock('@/components/dashboard/IncomeChart', () => ({
  default: ({
    actualValues,
    expectedValues,
  }: {
    actualValues: Array<number | null>
    expectedValues: Array<number | null>
  }) => (
    <div>
      趋势数据 计划 {expectedValues.join(',')} 实际 {actualValues.join(',')}
    </div>
  ),
}))
vi.mock('@/components/dashboard/ActionQueue', () => ({
  default: ({ payments }: { payments: Array<{ id: number }> }) => (
    <div>行动队列 {payments.length}</div>
  ),
}))
vi.mock('@/components/dashboard/ProjectList', () => ({
  default: ({ projects }: { projects: Project[] }) => <div>近期项目 {projects[0]?.name}</div>,
}))

const stats: DashboardStats = {
  avg_collection_days: 18,
  avg_collection_days_trend: 2,
  overdue_amount: 200,
  overdue_trend: 0,
  paid_amount: 700,
  paid_trend: 3,
  pending_amount: 100,
  pending_trend: 4,
  total_amount: 1_000,
  total_trend: 0,
}

const trend: IncomeTrend = {
  actual_values: [100],
  expected_values: [120, 230],
  labels: ['第一周'],
}

const payment = {
  actual_date: '',
  amount: 300,
  id: 1,
  method: '',
  percentage: 30,
  plan_date: '2099-07-15',
  project: { company: '橙子科技', id: 1, name: '星轨项目' },
  project_id: 1,
  remark: '',
  stage: '尾款',
  status: 'pending',
} as Payment
const apiResponse = <T,>(data: T) => ({ data: { data } })

describe('DashboardView resource rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reveals successful regions while one initial request remains pending', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(apiResponse(trend) as never)
    vi.mocked(dashboardApi.getRecentProjects).mockReturnValue(new Promise(() => undefined))
    vi.mocked(dashboardApi.getUpcomingPayments).mockResolvedValue(apiResponse([payment]) as never)

    render(<DashboardView />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '近30天预计回款' })).toBeInTheDocument(),
    )
    expect(screen.getByText('¥120.00')).toBeInTheDocument()
    expect(screen.getByText('同期已回款 ¥100.00')).toBeInTheDocument()
    expect(screen.getByText('已结算')).toBeInTheDocument()
    expect(screen.getByText('¥700.00')).toBeInTheDocument()
    expect(screen.getByText('待结算')).toBeInTheDocument()
    expect(screen.getByText('平均回款')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '处理待收款' })).toHaveAttribute(
      'href',
      '/projects/1?tab=payments&payment=1',
    )
    expect(screen.getByLabelText('较上期上升 3.00%，表现改善')).toBeInTheDocument()
    expect(screen.getByLabelText('较上期上升 4.00%，表现承压')).toBeInTheDocument()
    expect(screen.getByLabelText('较上期上升 2.00%，表现承压')).toBeInTheDocument()
    expect(screen.getByText('趋势数据 计划 120 实际 100')).toBeInTheDocument()
    expect(screen.getByText('行动队列 1')).toBeInTheDocument()
    expect(screen.queryByText('快捷操作')).not.toBeInTheDocument()
    expect(screen.getByLabelText('正在加载近期项目')).toBeInTheDocument()
    expect(screen.queryByLabelText('正在加载仪表盘')).not.toBeInTheDocument()
  })

  it('uses the action-oriented full skeleton while every resource is pending', () => {
    vi.mocked(dashboardApi.getStats).mockReturnValue(new Promise(() => undefined))
    vi.mocked(dashboardApi.getIncomeTrend).mockReturnValue(new Promise(() => undefined))
    vi.mocked(dashboardApi.getRecentProjects).mockReturnValue(new Promise(() => undefined))
    vi.mocked(dashboardApi.getUpcomingPayments).mockReturnValue(new Promise(() => undefined))

    const { container } = render(<DashboardView />)

    expect(screen.getByRole('status', { name: '正在加载仪表盘' })).toBeInTheDocument()
    expect(container.querySelector('.dashboard-skeleton__hero')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-action-grid')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-recent-projects')).toBeInTheDocument()
    expect(screen.queryByText('未来七天暂无待处理收款')).not.toBeInTheDocument()
  })

  it('keeps the hero usable with explicit fallbacks when dashboard resources fail', async () => {
    vi.mocked(dashboardApi.getStats).mockRejectedValue(new Error('stats unavailable'))
    vi.mocked(dashboardApi.getIncomeTrend).mockRejectedValue(new Error('trend unavailable'))
    vi.mocked(dashboardApi.getRecentProjects).mockResolvedValue(apiResponse([]) as never)
    vi.mocked(dashboardApi.getUpcomingPayments).mockRejectedValue(new Error('payments unavailable'))

    render(<DashboardView />)

    await waitFor(() => expect(screen.getByText('预计回款暂不可用')).toBeInTheDocument())
    expect(screen.getByText('逾期风险暂不可用')).toBeInTheDocument()
    expect(screen.getByText('收款计划暂不可用')).toBeInTheDocument()
    expect(screen.queryByText('暂无待收款计划')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看项目' })).toHaveAttribute('href', '/projects')
    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getAllByText('暂不可用')).toHaveLength(3)
    expect(screen.getByText('统计数据加载失败')).toBeInTheDocument()
    expect(screen.getByText('收入趋势加载失败')).toBeInTheDocument()
    expect(screen.getByText('收款计划加载失败')).toBeInTheDocument()
  })

  it('shows resource loading states without misreporting empty data', async () => {
    vi.mocked(dashboardApi.getStats).mockReturnValue(new Promise(() => undefined))
    vi.mocked(dashboardApi.getIncomeTrend).mockReturnValue(new Promise(() => undefined))
    vi.mocked(dashboardApi.getRecentProjects).mockResolvedValue(apiResponse([]) as never)
    vi.mocked(dashboardApi.getUpcomingPayments).mockReturnValue(new Promise(() => undefined))

    render(<DashboardView />)

    await waitFor(() =>
      expect(screen.getByRole('region', { name: '财务概览' })).toHaveAttribute('aria-busy', 'true'),
    )
    expect(screen.getByText('预计回款加载中')).toBeInTheDocument()
    expect(screen.getByText('逾期风险加载中')).toBeInTheDocument()
    expect(screen.getByText('收款计划加载中')).toBeInTheDocument()
    expect(screen.getByText('已结算加载中')).toBeInTheDocument()
    expect(screen.queryByText('暂无待收款计划')).not.toBeInTheDocument()
    expect(screen.queryByText('--')).not.toBeInTheDocument()
  })

  it('renders recent projects as the wide compact section below the action grid', async () => {
    const recentProject = {
      company: '橙子科技',
      id: 8,
      name: '轨道站点',
      received_amount: 200,
      status: 'active',
      total_amount: 500,
    } as Project
    vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(apiResponse(trend) as never)
    vi.mocked(dashboardApi.getRecentProjects).mockResolvedValue(
      apiResponse([recentProject]) as never,
    )
    vi.mocked(dashboardApi.getUpcomingPayments).mockResolvedValue(apiResponse([]) as never)

    const { container } = render(<DashboardView />)

    await waitFor(() => expect(screen.getByText('近期项目 轨道站点')).toBeInTheDocument())
    expect(container.querySelector('.dashboard-action-grid')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-recent-projects')).toBeInTheDocument()
  })
})
