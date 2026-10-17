import dayjs from 'dayjs'
import type { Payment, Project } from '@/api/project'

export type CollectionState = 'overdue' | 'pending' | 'review' | 'settled' | 'unplanned'

export interface CollectionSummary {
  state: CollectionState
  label: string
  remainingAmount: number
  overdueAmount: number
  overdueDays: number
  nextDueDate: string | null
  pendingPlanAmount: number
}

const isPending = (payment: Payment) => payment.status === 'pending' || payment.status === 'overdue'

export function getEffectivePaymentStatus(payment: Payment, today = dayjs()): Payment['status'] {
  return payment.status === 'pending' && dayjs(payment.plan_date).isBefore(today, 'day')
    ? 'overdue'
    : payment.status
}

export function getProjectCollectionSummary(
  project: Project,
  payments: Payment[] | undefined = project.payments,
  today = dayjs(),
): CollectionSummary {
  const remainingAmount = Math.max(project.total_amount - (project.received_amount || 0), 0)
  const pending = (payments || []).filter(isPending)
  const pendingPlanAmount = pending.reduce((sum, payment) => sum + payment.amount, 0)
  const overdue = pending.filter((payment) => dayjs(payment.plan_date).isBefore(today, 'day'))
  const overdueAmount = overdue.reduce((sum, payment) => sum + payment.amount, 0)
  const oldestOverdue = [...overdue].sort((a, b) => a.plan_date.localeCompare(b.plan_date))[0]
  const overdueDays = oldestOverdue ? today.diff(dayjs(oldestOverdue.plan_date), 'day') : 0
  const nextDueDate = [...pending].sort((a, b) => a.plan_date.localeCompare(b.plan_date))[0]
    ?.plan_date || null

  const base = { nextDueDate, overdueAmount, overdueDays, pendingPlanAmount, remainingAmount }
  if (pendingPlanAmount > remainingAmount + 0.01) {
    return { ...base, label: '计划需核对', state: 'review' }
  }
  if (overdueAmount > 0) {
    return { ...base, label: `逾期 ${overdueDays} 天`, state: 'overdue' }
  }
  if (remainingAmount <= 0.01) return { ...base, label: '已结清', state: 'settled' }
  if (pending.length > 0) return { ...base, label: '待收', state: 'pending' }
  return { ...base, label: '待安排', state: 'unplanned' }
}
