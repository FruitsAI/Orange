import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['notstarted', '未开始', 'status-badge--notstarted', 'ri-circle-line'],
    ['archived', '已归档', 'status-badge--archived', 'ri-archive-line'],
    ['overdue', '已逾期', 'status-badge--overdue', 'ri-alarm-warning-line'],
  ])('gives %s its own semantic treatment', (status, label, className, iconClass) => {
    render(<StatusBadge status={status} />)

    const badge = screen.getByText(label)
    expect(badge).toHaveClass(className)
    expect(badge).not.toHaveClass('status-badge--danger')
    expect(badge.querySelector('i')).toHaveClass(iconClass)
    expect(badge.querySelector('i')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps a custom visible label while retaining the status icon', () => {
    render(<StatusBadge label="等待启动" status="notstarted" />)

    const badge = screen.getByText('等待启动')
    expect(badge).toHaveClass('status-badge--notstarted')
    expect(badge.querySelector('i')).toHaveClass('ri-circle-line')
  })
})
