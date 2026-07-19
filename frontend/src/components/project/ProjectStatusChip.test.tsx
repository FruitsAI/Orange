import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import { PaymentStatusChip, ProjectStatusChip } from './ProjectStatusChip'

describe('project status adapters', () => {
  it.each([
    ['active', '进行中', 'accent'],
    ['completed', '已完成', 'success'],
    ['overdue', '已逾期', 'danger'],
    ['archived', '已归档', 'neutral'],
  ])('maps project status %s to an ODS chip', (status, label, tone) => {
    render(<ProjectStatusChip status={status} />)

    expect(screen.getByText(label)).toHaveClass('ods-chip')
    expect(screen.getByText(label)).toHaveAttribute('data-tone', tone)
  })

  it('uses the same ODS contract for payment status', () => {
    render(<PaymentStatusChip status="paid" />)

    expect(screen.getByText('已收款')).toHaveClass('ods-chip')
    expect(screen.getByText('已收款')).toHaveAttribute('data-tone', 'success')
  })
})
