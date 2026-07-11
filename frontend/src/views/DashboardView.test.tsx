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
vi.mock('@/components/dashboard/StatCard', () => ({
  default: ({ label, value }: { label: string; value: string }) => (
    <div>
      {label} {value}
    </div>
  ),
}))

const stats: DashboardStats = {
  avg_collection_days: 18,
  avg_collection_days_trend: 0,
  overdue_amount: 200,
  overdue_trend: 0,
  paid_amount: 700,
  paid_trend: 0,
  pending_amount: 100,
  pending_trend: 0,
  total_amount: 1_000,
  total_trend: 0,
}

const trend: IncomeTrend = {
  actual_values: [100],
  expected_values: [120],
  labels: ['第一周'],
}

const payment = { id: 1, plan_date: '2026-07-15', project_id: 1 } as Payment
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

    await waitFor(() => expect(screen.getByText(/总收款金额/)).toBeInTheDocument())
    expect(screen.getByText('趋势数据 100')).toBeInTheDocument()
    expect(screen.getByLabelText('正在加载近期项目')).toBeInTheDocument()
    expect(screen.queryByLabelText('正在加载仪表盘')).not.toBeInTheDocument()
  })
})
