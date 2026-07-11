import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi, type DashboardStats, type IncomeTrend } from '@/api/dashboard'
import type { Payment, Project } from '@/api/project'
import DashboardError from './DashboardError'
import { getPeriodLabel, toPaymentDisplay } from './dashboardModel'
import { useDashboardData } from './useDashboardData'

vi.mock('@/api/dashboard', () => ({
  dashboardApi: {
    getIncomeTrend: vi.fn(),
    getRecentProjects: vi.fn(),
    getStats: vi.fn(),
    getUpcomingPayments: vi.fn(),
  },
}))

const stats: DashboardStats = {
  avg_collection_days: 18,
  avg_collection_days_trend: -1,
  overdue_amount: 200,
  overdue_trend: 2,
  paid_amount: 700,
  paid_trend: 3,
  pending_amount: 100,
  pending_trend: -4,
  total_amount: 1_000,
  total_trend: 5,
}

const monthTrend: IncomeTrend = {
  actual_values: [100, 200],
  expected_values: [120, 220],
  labels: ['第1周', '第2周'],
}

const weekTrend: IncomeTrend = {
  actual_values: [50],
  expected_values: [60],
  labels: ['周一'],
}

const project: Project = {
  company: '橙子科技',
  contract_date: '2026-06-01',
  contract_number: 'ORANGE-001',
  create_time: '2026-06-01T00:00:00+08:00',
  description: '',
  end_date: '2026-12-31',
  id: 1,
  name: '未来财务台',
  payment_method: '分期',
  received_amount: 700,
  start_date: '2026-06-01',
  status: 'active',
  total_amount: 1_000,
  type: '设计',
}

const payment: Payment = {
  actual_date: '',
  amount: 300,
  id: 9,
  method: '',
  percentage: 30,
  plan_date: '2026-07-15',
  project,
  project_id: project.id,
  remark: '',
  stage: '尾款',
  status: 'pending',
}

const apiResponse = <T,>(data: T) => ({ data: { data } })

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function mockSuccessfulDashboard() {
  vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
  vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(apiResponse(monthTrend) as never)
  vi.mocked(dashboardApi.getRecentProjects).mockResolvedValue(apiResponse([project]) as never)
  vi.mocked(dashboardApi.getUpcomingPayments).mockResolvedValue(apiResponse([payment]) as never)
}

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts all four resources concurrently in their initial loading state', () => {
    const statsRequest = deferred<never>()
    const trendRequest = deferred<never>()
    const projectsRequest = deferred<never>()
    const paymentsRequest = deferred<never>()
    vi.mocked(dashboardApi.getStats).mockReturnValue(statsRequest.promise)
    vi.mocked(dashboardApi.getIncomeTrend).mockReturnValue(trendRequest.promise)
    vi.mocked(dashboardApi.getRecentProjects).mockReturnValue(projectsRequest.promise)
    vi.mocked(dashboardApi.getUpcomingPayments).mockReturnValue(paymentsRequest.promise)

    const { result, unmount } = renderHook(() => useDashboardData())

    expect(dashboardApi.getStats).toHaveBeenCalledTimes(1)
    expect(dashboardApi.getIncomeTrend).toHaveBeenCalledWith('month')
    expect(dashboardApi.getRecentProjects).toHaveBeenCalledTimes(1)
    expect(dashboardApi.getUpcomingPayments).toHaveBeenCalledTimes(1)
    expect(result.current.stats.loading).toBe(true)
    expect(result.current.trend.loading).toBe(true)
    expect(result.current.projects.loading).toBe(true)
    expect(result.current.payments.loading).toBe(true)
    expect(result.current.initialLoading).toBe(true)

    unmount()
  })

  it('publishes each successful resource without waiting for the others', async () => {
    const statsRequest = deferred<ReturnType<typeof apiResponse<DashboardStats>>>()
    const trendRequest = deferred<never>()
    const projectsRequest = deferred<never>()
    const paymentsRequest = deferred<never>()
    vi.mocked(dashboardApi.getStats).mockReturnValue(statsRequest.promise as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockReturnValue(trendRequest.promise)
    vi.mocked(dashboardApi.getRecentProjects).mockReturnValue(projectsRequest.promise)
    vi.mocked(dashboardApi.getUpcomingPayments).mockReturnValue(paymentsRequest.promise)

    const { result, unmount } = renderHook(() => useDashboardData())

    await act(async () => statsRequest.resolve(apiResponse(stats)))

    expect(result.current.stats.data).toEqual(stats)
    expect(result.current.stats.loading).toBe(false)
    expect(result.current.trend.loading).toBe(true)
    expect(result.current.projects.loading).toBe(true)
    expect(result.current.payments.loading).toBe(true)

    unmount()
  })

  it('isolates a failed resource while keeping successful resources available', async () => {
    const paymentsError = new Error('payments unavailable')
    vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(apiResponse(monthTrend) as never)
    vi.mocked(dashboardApi.getRecentProjects).mockResolvedValue(apiResponse([project]) as never)
    vi.mocked(dashboardApi.getUpcomingPayments).mockRejectedValue(paymentsError)

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => expect(result.current.initialLoading).toBe(false))

    expect(result.current.stats.data).toEqual(stats)
    expect(result.current.trend.data).toEqual(monthTrend)
    expect(result.current.projects.data).toEqual([project])
    expect(result.current.payments.data).toBeNull()
    expect(result.current.payments.error).toBe(paymentsError)
    expect(result.current.stats.error).toBeNull()
  })

  it('retries only failed resources when retry is called without a target', async () => {
    const projectsError = new Error('projects unavailable')
    const projectsRetry = deferred<ReturnType<typeof apiResponse<Project[]>>>()
    vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(apiResponse(monthTrend) as never)
    vi.mocked(dashboardApi.getRecentProjects)
      .mockRejectedValueOnce(projectsError)
      .mockReturnValueOnce(projectsRetry.promise as never)
    vi.mocked(dashboardApi.getUpcomingPayments).mockResolvedValue(apiResponse([payment]) as never)
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.initialLoading).toBe(false))

    act(() => result.current.retry())

    expect(result.current.initialLoading).toBe(false)
    expect(result.current.stats.data).toEqual(stats)
    await act(async () => projectsRetry.resolve(apiResponse([project])))
    await waitFor(() => expect(result.current.projects.data).toEqual([project]))

    expect(dashboardApi.getRecentProjects).toHaveBeenCalledTimes(2)
    expect(dashboardApi.getStats).toHaveBeenCalledTimes(1)
    expect(dashboardApi.getIncomeTrend).toHaveBeenCalledTimes(1)
    expect(dashboardApi.getUpcomingPayments).toHaveBeenCalledTimes(1)
    expect(result.current.projects.error).toBeNull()
  })

  it('keeps existing data visible and marks resources as refreshing during retry all', async () => {
    mockSuccessfulDashboard()
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.initialLoading).toBe(false))
    const statsRefresh = deferred<never>()
    const trendRefresh = deferred<never>()
    const projectsRefresh = deferred<never>()
    const paymentsRefresh = deferred<never>()
    vi.mocked(dashboardApi.getStats).mockReturnValueOnce(statsRefresh.promise)
    vi.mocked(dashboardApi.getIncomeTrend).mockReturnValueOnce(trendRefresh.promise)
    vi.mocked(dashboardApi.getRecentProjects).mockReturnValueOnce(projectsRefresh.promise)
    vi.mocked(dashboardApi.getUpcomingPayments).mockReturnValueOnce(paymentsRefresh.promise)

    act(() => result.current.retry('all'))

    expect(result.current.stats.data).toEqual(stats)
    expect(result.current.stats.loading).toBe(false)
    expect(result.current.stats.refreshing).toBe(true)
    expect(result.current.trend.data).toEqual(monthTrend)
    expect(result.current.trend.refreshing).toBe(true)
    expect(result.current.projects.data).toEqual([project])
    expect(result.current.projects.refreshing).toBe(true)
    expect(result.current.payments.data).toHaveLength(1)
    expect(result.current.payments.refreshing).toBe(true)
  })

  it('requests only the trend endpoint when the active period changes', async () => {
    mockSuccessfulDashboard()
    vi.mocked(dashboardApi.getIncomeTrend)
      .mockResolvedValueOnce(apiResponse(monthTrend) as never)
      .mockResolvedValueOnce(apiResponse(weekTrend) as never)
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.initialLoading).toBe(false))

    act(() => result.current.setPeriod('week'))
    await waitFor(() => expect(result.current.trend.data).toEqual(weekTrend))

    expect(result.current.activePeriod).toBe('week')
    expect(result.current.periodLabel).toBe('近7天')
    expect(dashboardApi.getIncomeTrend).toHaveBeenNthCalledWith(2, 'week')
    expect(dashboardApi.getStats).toHaveBeenCalledTimes(1)
    expect(dashboardApi.getRecentProjects).toHaveBeenCalledTimes(1)
    expect(dashboardApi.getUpcomingPayments).toHaveBeenCalledTimes(1)
  })

  it('does not let an older trend request overwrite a newer period', async () => {
    const monthRequest = deferred<ReturnType<typeof apiResponse<IncomeTrend>>>()
    const weekRequest = deferred<ReturnType<typeof apiResponse<IncomeTrend>>>()
    vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
    vi.mocked(dashboardApi.getIncomeTrend)
      .mockReturnValueOnce(monthRequest.promise as never)
      .mockReturnValueOnce(weekRequest.promise as never)
    vi.mocked(dashboardApi.getRecentProjects).mockResolvedValue(apiResponse([project]) as never)
    vi.mocked(dashboardApi.getUpcomingPayments).mockResolvedValue(apiResponse([payment]) as never)
    const { result } = renderHook(() => useDashboardData())

    act(() => result.current.setPeriod('week'))
    await act(async () => weekRequest.resolve(apiResponse(weekTrend)))
    expect(result.current.trend.data).toEqual(weekTrend)

    await act(async () => monthRequest.resolve(apiResponse(monthTrend)))
    expect(result.current.trend.data).toEqual(weekTrend)
    expect(result.current.activePeriod).toBe('week')
  })

  it('ignores request completion after unmount', async () => {
    const statsRequest = deferred<ReturnType<typeof apiResponse<DashboardStats>>>()
    vi.mocked(dashboardApi.getStats).mockReturnValue(statsRequest.promise as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockReturnValue(deferred<never>().promise)
    vi.mocked(dashboardApi.getRecentProjects).mockReturnValue(deferred<never>().promise)
    vi.mocked(dashboardApi.getUpcomingPayments).mockReturnValue(deferred<never>().promise)
    const { unmount } = renderHook(() => useDashboardData())

    unmount()
    await act(async () => statsRequest.resolve(apiResponse(stats)))

    expect(dashboardApi.getStats).toHaveBeenCalledTimes(1)
  })
})

describe('dashboard model', () => {
  it('keeps overdue days negative and compares local calendar days', () => {
    const now = new Date(2026, 6, 12, 23, 59, 59)
    const display = toPaymentDisplay({ ...payment, plan_date: '2026-07-11' }, now)

    expect(display.days_left).toBe(-1)
    expect(display.status).toBe('danger')
  })

  it('describes the month API period accurately as the last 30 days', () => {
    expect(getPeriodLabel('month')).toBe('近30天')
  })
})

describe('DashboardError', () => {
  it('announces the error and exposes an accessible retry action', async () => {
    const onRetry = vi.fn()
    render(<DashboardError message="收款计划加载失败" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('收款计划加载失败')
    await userEvent.click(screen.getByRole('button', { name: '重试收款计划' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
