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
  default: ({ values }: { values: number[] }) => <div>趋势数据 {values.join(',')}</div>,
}))
vi.mock('@/components/dashboard/QuickActions', () => ({ default: () => <div>快捷操作</div> }))
vi.mock('@/components/dashboard/ProjectList', () => ({
  default: ({ projects }: { projects: Project[] }) => <div>近期项目 {projects[0]?.name}</div>,
}))
vi.mock('@/components/dashboard/UpcomingPayments', () => ({
  default: () => <div>待收款列表</div>,
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
    expect(screen.getByText('¥350.00')).toBeInTheDocument()
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
    expect(screen.getByText('趋势数据 100')).toBeInTheDocument()
    expect(screen.getByLabelText('正在加载近期项目')).toBeInTheDocument()
    expect(screen.queryByLabelText('正在加载仪表盘')).not.toBeInTheDocument()
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
})
