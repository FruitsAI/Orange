import { describe, expect, it } from 'vitest'
import { normalizeSeries } from '@/views/dashboard/dashboardModel'
import { createIncomeChartConfig, incomePeriodOptions } from './incomeChartConfig'

describe('income chart configuration', () => {
  it('builds expected and actual series with distinct visual priority', () => {
    const config = createIncomeChartConfig({
      actualValues: [80, 120],
      expectedValues: [100, 140],
      labels: ['一月', '二月'],
      reducedMotion: false,
      theme: 'dark',
    })

    expect(config.data.labels).toEqual(['一月', '二月'])
    expect(config.data.datasets).toHaveLength(2)
    expect(config.data.datasets[0]).toMatchObject({
      borderDash: [6, 6],
      data: [100, 140],
      fill: false,
      label: '计划回款',
    })
    expect(config.data.datasets[1]).toMatchObject({
      data: [80, 120],
      fill: true,
      label: '实际回款',
    })
  })

  it('provides all period controls and their supporting labels', () => {
    expect(incomePeriodOptions).toEqual([
      { label: '周', period: 'week', subtitle: '近7天计划与实际回款' },
      { label: '月', period: 'month', subtitle: '近30天计划与实际回款' },
      { label: '季度', period: 'quarter', subtitle: '近3个月计划与实际回款' },
      { label: '年', period: 'year', subtitle: '近12个月计划与实际回款' },
    ])
  })

  it('uses opaque theme surfaces and disables animation for reduced motion', () => {
    const light = createIncomeChartConfig({
      actualValues: [],
      expectedValues: [],
      labels: [],
      reducedMotion: true,
      theme: 'light',
    })
    const dark = createIncomeChartConfig({
      actualValues: [],
      expectedValues: [],
      labels: [],
      reducedMotion: false,
      theme: 'dark',
    })

    expect(light.options?.animation).toMatchObject({ duration: 0 })
    expect(dark.options?.animation).toMatchObject({ duration: 240 })
    expect(light.options?.plugins?.tooltip?.backgroundColor).toBe('#fffaf5')
    expect(dark.options?.plugins?.tooltip?.backgroundColor).toBe('#211d1a')
  })

  it('normalizes each series to the label count without inventing unlabeled points', () => {
    expect(normalizeSeries(['一月', '二月'], [100, 200, 300])).toEqual([100, 200])
    expect(normalizeSeries(['一月', '二月', '三月'], [100])).toEqual([100, null, null])
    expect(normalizeSeries(['一月', '二月'], undefined)).toEqual([null, null])
  })

  it('represents non-finite values as missing data instead of zero', () => {
    expect(
      normalizeSeries(
        ['一月', '二月', '三月', '四月'],
        [100, Number.NaN, Number.POSITIVE_INFINITY, -25],
      ),
    ).toEqual([100, null, null, -25])
  })

  it('applies normalized series to the chart datasets', () => {
    const config = createIncomeChartConfig({
      actualValues: [80],
      expectedValues: [100, Number.NaN, 300, 500],
      labels: ['一月', '二月', '三月'],
      reducedMotion: false,
      theme: 'light',
    })

    expect(config.data.datasets[0].data).toEqual([100, null, 300])
    expect(config.data.datasets[1].data).toEqual([80, null, null])
  })
})
