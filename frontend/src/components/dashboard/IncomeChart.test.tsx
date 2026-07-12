import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { useThemeStore } from '@/stores/theme'
import IncomeChart from './IncomeChart'

interface MockChartData {
  labels: unknown[]
  datasets: Array<{ data: number[] }>
}

interface MockChartOptions {
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
    chartMocks.constructor.mockClear()
    chartMocks.instances.length = 0
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
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
})
