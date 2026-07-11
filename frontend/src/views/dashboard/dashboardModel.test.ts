import { describe, expect, it } from 'vitest'
import type { IncomeTrend } from '@/api/dashboard'
import type { PaymentDisplayItem } from './dashboardModel'
import {
  findNearestUpcomingPayment,
  getPaymentDueLabel,
  sumIncomeValues,
  toMetricTrend,
} from './dashboardModel'

const payment = (id: number, daysLeft: number): PaymentDisplayItem => ({
  amount: id * 100,
  client_name: '橙子科技',
  days_left: daysLeft,
  id,
  project_id: id + 10,
  project_name: `项目 ${id}`,
  status: 'warning',
})

describe('dashboard hero model', () => {
  it('sums the successful expected trend values without using dashboard totals', () => {
    const trend: IncomeTrend = {
      actual_values: [50, 75],
      expected_values: [100, 250, 650],
      labels: ['一', '二', '三'],
    }

    expect(sumIncomeValues(trend.expected_values)).toBe(1_000)
    expect(sumIncomeValues(trend.actual_values)).toBe(125)
  })

  it('chooses the non-overdue payment with the fewest days left', () => {
    expect(
      findNearestUpcomingPayment([payment(1, 8), payment(2, -2), payment(3, 1)]),
    ).toMatchObject({ id: 3, days_left: 1 })
  })

  it('returns null when every payment is overdue or the resource is unavailable', () => {
    expect(findNearestUpcomingPayment([payment(1, -8), payment(2, -1)])).toBeNull()
    expect(findNearestUpcomingPayment(null)).toBeNull()
  })

  it('formats upcoming payment timing as safe presentation copy', () => {
    expect(getPaymentDueLabel(3)).toBe('下一笔 3 天后到期')
    expect(getPaymentDueLabel(0)).toBe('下一笔今日到期')
  })

  it('separates numeric trend direction from business polarity', () => {
    expect(toMetricTrend(3, true)).toMatchObject({ direction: 'up', tone: 'positive' })
    expect(toMetricTrend(4, false)).toMatchObject({ direction: 'up', tone: 'negative' })
    expect(toMetricTrend(-2, false)).toMatchObject({ direction: 'down', tone: 'positive' })
    expect(toMetricTrend(0, true)).toMatchObject({ direction: 'flat', tone: 'neutral' })
    expect(toMetricTrend(0, true).accessibleLabel).toBe('较上期持平 0.00%，保持稳定')
    expect(toMetricTrend(4, false).accessibleLabel).toBe('较上期上升 4.00%，表现承压')
  })
})
