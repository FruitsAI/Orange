import type { Payment } from '@/api/project'

export type DashboardPeriod = 'week' | 'month' | 'quarter' | 'year'

export type PaymentDisplayStatus = 'danger' | 'success' | 'warning'

export interface PaymentDisplayItem {
  id: number
  project_id: number
  project_name: string
  client_name: string
  days_left: number
  amount: number
  status: PaymentDisplayStatus
}

const periodLabels: Record<DashboardPeriod, string> = {
  month: '近30天',
  quarter: '近3个月',
  week: '近7天',
  year: '近12个月',
}

export function getPeriodLabel(period: DashboardPeriod) {
  return periodLabels[period]
}

export type IncomeSeriesValue = number | null

export function normalizeSeries(
  labels: string[],
  values?: ReadonlyArray<IncomeSeriesValue>,
): IncomeSeriesValue[] {
  return labels.map((_, index) => {
    const value = values?.[index]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  })
}

export function sumIncomeValues(values: ReadonlyArray<IncomeSeriesValue>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

export function findNearestUpcomingPayment(payments: PaymentDisplayItem[] | null) {
  if (!payments) return null

  return payments.reduce<PaymentDisplayItem | null>((nearest, payment) => {
    if (payment.days_left < 0) return nearest
    if (!nearest || payment.days_left < nearest.days_left) return payment
    return nearest
  }, null)
}

export function getPaymentDueLabel(daysLeft: number) {
  return daysLeft === 0 ? '下一笔今日到期' : `下一笔 ${daysLeft} 天后到期`
}

export function toMetricTrend(value: number, positiveIsGood: boolean) {
  const direction =
    value === 0 ? ('flat' as const) : value > 0 ? ('up' as const) : ('down' as const)
  const improved = value === 0 ? null : value > 0 === positiveIsGood
  const tone =
    improved === null
      ? ('neutral' as const)
      : improved
        ? ('positive' as const)
        : ('negative' as const)
  const directionLabel = value === 0 ? '持平' : value > 0 ? '上升' : '下降'
  const outcomeLabel = improved === null ? '保持稳定' : improved ? '表现改善' : '表现承压'

  return {
    accessibleLabel: `较上期${directionLabel} ${Math.abs(value).toFixed(2)}%，${outcomeLabel}`,
    direction,
    label: `较上期 ${Math.abs(value).toFixed(2)}%`,
    tone,
  }
}

function toCalendarDay(value: string | Date) {
  if (typeof value === 'string') {
    const localDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (localDate) {
      const year = Number(localDate[1])
      const month = Number(localDate[2]) - 1
      const day = Number(localDate[3])
      const parsed = new Date(year, month, day)
      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month &&
        parsed.getDate() === day
      ) {
        return Date.UTC(year, month, day) / 86_400_000
      }
      return null
    }
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

export function toPaymentDisplay(payment: Payment, now = new Date()): PaymentDisplayItem {
  const today = toCalendarDay(now) ?? 0
  const dueDay = toCalendarDay(payment.plan_date) ?? today
  const daysLeft = dueDay - today

  return {
    amount: payment.amount,
    client_name: payment.project?.company || '未知客户',
    days_left: daysLeft,
    id: payment.id,
    project_id: payment.project_id,
    project_name: payment.project?.name || '未知项目',
    status: daysLeft < 3 ? 'danger' : daysLeft < 7 ? 'warning' : 'success',
  }
}
