import { describe, expect, it } from 'vitest'
import {
  createIncomeChartConfig,
  incomePeriodOptions,
  sanitizeIncomeValues,
} from './incomeChartConfig'

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
      { label: '季度', period: 'quarter', subtitle: '本季度计划与实际回款' },
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

  it('turns missing and non-finite data into safe chart values', () => {
    expect(sanitizeIncomeValues(undefined)).toEqual([])
    expect(sanitizeIncomeValues([100, Number.NaN, Number.POSITIVE_INFINITY, -25])).toEqual([
      100, 0, 0, -25,
    ])
  })
})
