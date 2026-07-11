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
  quarter: '本季度',
  week: '近7天',
  year: '近12个月',
}

export function getPeriodLabel(period: DashboardPeriod) {
  return periodLabels[period]
}

export function sumIncomeValues(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function findNearestUpcomingPayment(payments: PaymentDisplayItem[] | null) {
  if (!payments) return null

  return payments.reduce<PaymentDisplayItem | null>((nearest, payment) => {
    if (payment.days_left < 0) return nearest
    if (!nearest || payment.days_left < nearest.days_left) return payment
    return nearest
  }, null)
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
