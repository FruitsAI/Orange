import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { useThemeStore } from '@/stores/theme'
import IncomeChart from './IncomeChart'

interface MockChartData {
  labels: unknown[]
  datasets: Array<{ data: Array<number | null> }>
}

interface MockChartOptions {
  animation?: { duration: number }
  plugins?: unknown
  [key: string]: unknown
}

const chartMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  instances: [] as Array<{
    data: MockChartData
    destroy: ReturnType<typeof vi.fn>
    options: MockChartOptions
    update: ReturnType<typeof vi.fn>
  }>,
}))

let reducedMotion = false
let motionListeners: Set<(event: MediaQueryListEvent) => void>

vi.mock('chart.js/auto', () => ({
  default: class MockChart {
    data: MockChartData
    destroy = vi.fn()
    options: MockChartOptions
    update = vi.fn()

    constructor(_context: unknown, config: { data: MockChartData; options: MockChartOptions }) {
      this.data = config.data
      this.options = config.options
      chartMocks.constructor(config)
      chartMocks.instances.push(this)
    }
  },
}))

describe('IncomeChart', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    chartMocks.constructor.mockClear()
    chartMocks.instances.length = 0
    reducedMotion = false
    motionListeners = new Set()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          addEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
            if (type === 'change') motionListeners.add(listener)
          },
          addListener: () => undefined,
          dispatchEvent: () => false,
          matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
          media: query,
          onchange: null,
          removeEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
            if (type === 'change') motionListeners.delete(listener)
          },
          removeListener: () => undefined,
        }) as MediaQueryList,
    )
    useThemeStore.setState({ effectiveTheme: 'light', theme: 'light' })
  })

  it('offers week, month, quarter, and year period controls', () => {
    const onPeriodChange = vi.fn()
    render(
      <IncomeChart
        actualValues={[]}
        expectedValues={[]}
        labels={[]}
        onPeriodChange={onPeriodChange}
        period="month"
      />,
    )

    expect(screen.getByText('近30天计划与实际回款')).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '周',
      '月',
      '季度',
      '年',
    ])
    fireEvent.click(screen.getByRole('button', { name: '季度' }))
    expect(onPeriodChange).toHaveBeenCalledWith('quarter')
  })

  it('describes every labeled plan and actual value in an accessible table', () => {
    render(
      <IncomeChart
        actualValues={[80]}
        expectedValues={[100, Number.NaN]}
        labels={['一月', '二月']}
        onPeriodChange={() => undefined}
        period="month"
      />,
    )

    expect(screen.queryByRole('img', { name: '计划与实际回款趋势图' })).not.toBeInTheDocument()
    const table = screen.getByRole('table', { name: '近30天计划与实际回款数据' })
    expect(within(table).getByRole('row', { name: '一月 ¥100.00 ¥80.00' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: '二月 暂无数据 暂无数据' })).toBeInTheDocument()
  })

  it('updates data and theme without constructing a second chart', async () => {
    const { rerender } = render(
      <IncomeChart
        actualValues={[80]}
        expectedValues={[100]}
        labels={['一月']}
        onPeriodChange={() => undefined}
        period="month"
      />,
    )
    const chart = chartMocks.instances[0]

    rerender(
      <IncomeChart
        actualValues={[120, 180]}
        expectedValues={[140, 200]}
        labels={['二月', '三月']}
        onPeriodChange={() => undefined}
        period="quarter"
      />,
    )
    act(() => useThemeStore.setState({ effectiveTheme: 'dark' }))

    await waitFor(() => expect(chart.update).toHaveBeenCalled())
    expect(chartMocks.constructor).toHaveBeenCalledTimes(1)
    expect(chart.data.labels).toEqual(['二月', '三月'])
    expect(chart.data.datasets[0].data).toEqual([140, 200])
    expect(chart.data.datasets[1].data).toEqual([120, 180])
    expect(chart.options.plugins).toMatchObject({
      tooltip: { backgroundColor: '#211d1a' },
    })
  })

  it('destroys its chart only when unmounted', () => {
    const { unmount } = render(
      <IncomeChart
        actualValues={[]}
        expectedValues={[]}
        labels={[]}
        onPeriodChange={() => undefined}
        period="week"
      />,
    )
    const chart = chartMocks.instances[0]

    expect(chart.destroy).not.toHaveBeenCalled()
    unmount()
    expect(chart.destroy).toHaveBeenCalledTimes(1)
  })

  it('updates chart animation when reduced-motion changes at runtime', async () => {
    render(
      <IncomeChart
        actualValues={[80]}
        expectedValues={[100]}
        labels={['一月']}
        onPeriodChange={() => undefined}
        period="month"
      />,
    )
    const chart = chartMocks.instances[0]

    expect(chart.options.animation).toMatchObject({ duration: 240 })
    act(() => {
      reducedMotion = true
      const event = { matches: true, media: '(prefers-reduced-motion: reduce)' }
      motionListeners.forEach((listener) => listener(event as MediaQueryListEvent))
    })

    await waitFor(() => expect(chart.options.animation).toMatchObject({ duration: 0 }))
    expect(chart.update).toHaveBeenCalled()
  })

  it('does not leak chart instances during StrictMode effect probing', () => {
    const { unmount } = render(
      <IncomeChart
        actualValues={[80]}
        expectedValues={[100]}
        labels={['一月']}
        onPeriodChange={() => undefined}
        period="month"
      />,
      { reactStrictMode: true },
    )

    expect(chartMocks.instances).toHaveLength(2)
    expect(chartMocks.instances[0].destroy).toHaveBeenCalledTimes(1)
    expect(chartMocks.instances[1].destroy).not.toHaveBeenCalled()

    unmount()
    expect(chartMocks.instances[1].destroy).toHaveBeenCalledTimes(1)
  })
})
