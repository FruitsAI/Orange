import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { Payment, Project } from '@/api/project'
import { getProjectCollectionSummary } from './projectCollection'

const project = {
  id: 1,
  total_amount: 1000,
  received_amount: 1000,
} as Project

const plan = (amount: number, planDate: string, status: Payment['status'] = 'pending') =>
  ({ amount, plan_date: planDate, status } as Payment)

describe('getProjectCollectionSummary', () => {
  it('flags a pending plan after the contract has already been fully collected', () => {
    const result = getProjectCollectionSummary(project, [plan(1000, '2026-07-16')], dayjs('2026-09-28'))

    expect(result.state).toBe('review')
    expect(result.remainingAmount).toBe(0)
    expect(result.pendingPlanAmount).toBe(1000)
  })

  it('keeps project delivery status separate from an overdue payment', () => {
    const result = getProjectCollectionSummary(
      { ...project, received_amount: 0, status: 'notstarted' },
      [plan(1000, '2026-09-15')],
      dayjs('2026-09-28'),
    )

    expect(result.state).toBe('overdue')
    expect(result.label).toBe('逾期 13 天')
    expect(result.overdueAmount).toBe(1000)
  })
})
