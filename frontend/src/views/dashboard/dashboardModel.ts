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

function toLocalDay(value: string | Date) {
  if (typeof value === 'string') {
    const localDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (localDate) {
      return new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]))
    }
  }

  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function toPaymentDisplay(payment: Payment, now = new Date()): PaymentDisplayItem {
  const dueDay = toLocalDay(payment.plan_date)
  const today = toLocalDay(now)
  const daysLeft = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)

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
