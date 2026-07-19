import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import { render, screen, waitFor } from '@/test/render'
import AnalyticsView from './AnalyticsView'

interface ChartMockInstance {
  data: { datasets: Array<{ data: number[] }>; labels: string[] }
}

const { chartInstances } = vi.hoisted(() => ({
  chartInstances: [] as ChartMockInstance[],
}))

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}

vi.mock('@/api/dashboard', () => ({
  dashboardApi: {
    getIncomeTrend: vi.fn(),
    getStats: vi.fn(),
  },
}))

vi.mock('chart.js/auto', () => ({
  default: class ChartMock {
    data: { datasets: Array<{ data: number[] }>; labels: string[] }

    constructor(_context: unknown, configuration: { data: ChartMock['data'] }) {
      this.data = configuration.data
      chartInstances.push(this)
    }

    destroy() {}

    update() {}
  },
}))

const stats: DashboardStats = {
  avg_collection_days: 12,
  avg_collection_days_trend: -2,
  overdue_amount: 50,
  overdue_trend: -1,
  paid_amount: 750,
  paid_trend: 5,
  pending_amount: 200,
  pending_trend: 3,
  total_amount: 1_000,
  total_trend: 4,
}

const apiResponse = <T,>(data: T) => ({ data: { data } })

describe('AnalyticsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chartInstances.length = 0
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    vi.mocked(dashboardApi.getStats).mockResolvedValue(apiResponse(stats) as never)
    vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(
      apiResponse({ actual_values: [750], expected_values: [1_000], labels: ['本期'] }) as never,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses Orange Design System controls and switches the reporting period', async () => {
    const user = userEvent.setup()
    const { container } = render(<AnalyticsView />)

    await waitFor(() =>
      expect(dashboardApi.getStats).toHaveBeenCalledWith('month', expect.any(AbortSignal)),
    )
    const periodTabs = screen.getByRole('tablist', { name: '统计周期' })
    expect(periodTabs).toHaveAttribute('data-variant', 'accent')
    expect(screen.getByRole('tab', { name: '月' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(4)
    expect(screen.getByRole('tabpanel', { name: '月' })).toBeVisible()
    expect(container.querySelectorAll('.analytics-chart-layout > .ods-card')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-tabs__tab')).toHaveLength(4)
    expect(screen.getByRole('button', { name: '导出报表' })).toHaveAttribute(
      'data-variant',
      'primary',
    )
    expect(container.querySelector('.glass-card')).not.toBeInTheDocument()
    expect(container.querySelector('.btn')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '周' }))

    await waitFor(() =>
      expect(dashboardApi.getStats).toHaveBeenCalledWith('week', expect.any(AbortSignal)),
    )
    expect(screen.getByRole('tab', { name: '周' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: '周' })).toBeVisible()
    expect(screen.getByText('周度收入对比')).toBeInTheDocument()
  })

  it('keeps the latest period when older stats and trend requests resolve last', async () => {
    const user = userEvent.setup()
    const monthStats = createDeferred<Awaited<ReturnType<typeof dashboardApi.getStats>>>()
    const weekStats = createDeferred<Awaited<ReturnType<typeof dashboardApi.getStats>>>()
    const monthTrend = createDeferred<Awaited<ReturnType<typeof dashboardApi.getIncomeTrend>>>()
    const weekTrend = createDeferred<Awaited<ReturnType<typeof dashboardApi.getIncomeTrend>>>()
    const latestStats = { ...stats, total_amount: 2_000 }

    vi.mocked(dashboardApi.getStats).mockImplementation((period) =>
      period === 'month' ? monthStats.promise : weekStats.promise,
    )
    vi.mocked(dashboardApi.getIncomeTrend).mockImplementation((period) =>
      period === 'month' ? monthTrend.promise : weekTrend.promise,
    )

    render(<AnalyticsView />)
    await waitFor(() =>
      expect(dashboardApi.getStats).toHaveBeenCalledWith('month', expect.any(AbortSignal)),
    )
    await user.click(screen.getByRole('tab', { name: '周' }))
    await waitFor(() =>
      expect(dashboardApi.getStats).toHaveBeenCalledWith('week', expect.any(AbortSignal)),
    )

    weekStats.resolve(apiResponse(latestStats) as never)
    weekTrend.resolve(
      apiResponse({
        actual_values: [1_500],
        expected_values: [2_000],
        labels: ['最新周'],
      }) as never,
    )
    await waitFor(() => expect(screen.getByText('¥2,000')).toBeInTheDocument())
    const barChart = chartInstances.find((instance) => instance.data.datasets.length === 2)
    await waitFor(() => expect(barChart?.data.labels).toEqual(['最新周']))

    monthStats.resolve(apiResponse(stats) as never)
    monthTrend.resolve(
      apiResponse({ actual_values: [750], expected_values: [1_000], labels: ['旧月份'] }) as never,
    )
    await Promise.all([monthStats.promise, monthTrend.promise, Promise.resolve()])

    expect(screen.getByText('¥2,000')).toBeInTheDocument()
    expect(barChart?.data.labels).toEqual(['最新周'])
  })

  it('does not relabel stale data while a new period is loading or after it fails', async () => {
    const user = userEvent.setup()
    const weekStats = createDeferred<Awaited<ReturnType<typeof dashboardApi.getStats>>>()
    const weekTrend = createDeferred<Awaited<ReturnType<typeof dashboardApi.getIncomeTrend>>>()

    vi.mocked(dashboardApi.getStats).mockImplementation((period) =>
      period === 'week' ? weekStats.promise : Promise.resolve(apiResponse(stats) as never),
    )
    vi.mocked(dashboardApi.getIncomeTrend).mockImplementation((period) =>
      period === 'week'
        ? weekTrend.promise
        : Promise.resolve(
            apiResponse({
              actual_values: [750],
              expected_values: [1_000],
              labels: ['本期'],
            }) as never,
          ),
    )

    render(<AnalyticsView />)
    await waitFor(() => expect(screen.getByText('¥1,000')).toBeInTheDocument())

    await user.click(screen.getByRole('tab', { name: '周' }))

    expect(screen.getByText('周度回款概览 · 正在加载')).toBeInTheDocument()
    expect(screen.getByText('预期收款加载中')).toBeInTheDocument()
    expect(screen.queryByText('¥1,000')).not.toBeInTheDocument()

    weekStats.reject(new Error('stats failed'))
    weekTrend.reject(new Error('trend failed'))

    await waitFor(() => expect(screen.getByText('周度回款概览 · 数据暂不可用')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: '重新加载' })).toHaveLength(2)
    expect(screen.queryByText('¥1,000')).not.toBeInTheDocument()
  })

  it('renders overdue as a subset of pending instead of double counting it', async () => {
    render(<AnalyticsView />)

    await waitFor(() => expect(screen.getByText('¥1,000')).toBeInTheDocument())
    const doughnutChart = chartInstances.find((instance) => instance.data.datasets.length === 1)

    await waitFor(() => expect(doughnutChart?.data.datasets[0]?.data).toEqual([750, 150, 50]))
    expect(screen.getByRole('region', { name: '资金状态对比' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: '待收未逾期 ¥150.00' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/收款率.*上升/)).not.toBeInTheDocument()
  })

  it('uses design-system empty states instead of blank canvases when a period has no data', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(
      apiResponse({
        ...stats,
        overdue_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        total_amount: 0,
      }) as never,
    )
    vi.mocked(dashboardApi.getIncomeTrend).mockResolvedValue(
      apiResponse({ actual_values: [0], expected_values: [0], labels: ['本期'] }) as never,
    )

    const { container } = render(<AnalyticsView />)

    expect(await screen.findByText('本期暂无回款趋势')).toBeInTheDocument()
    expect(screen.getByText('本期暂无资金状态数据')).toBeInTheDocument()
    expect(container.querySelectorAll('canvas')).toHaveLength(0)
  })
})
