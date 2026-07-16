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
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
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

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith('month'))
    expect(screen.getByRole('group', { name: '统计周期' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '月' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.chart-layout > .ods-card')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-button').length).toBeGreaterThanOrEqual(5)
    expect(container.querySelector('.glass-card')).not.toBeInTheDocument()
    expect(container.querySelector('.btn')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '周' }))

    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith('week'))
    expect(screen.getByRole('button', { name: '周' })).toHaveAttribute('aria-pressed', 'true')
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
    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith('month'))
    await user.click(screen.getByRole('button', { name: '周' }))
    await waitFor(() => expect(dashboardApi.getStats).toHaveBeenCalledWith('week'))

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
})
