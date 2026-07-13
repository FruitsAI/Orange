import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import type { PaymentDisplayItem } from '@/views/dashboard/dashboardModel'
import ActionQueue from './ActionQueue'

const payment = (
  id: number,
  daysLeft: number,
  overrides: Partial<PaymentDisplayItem> = {},
): PaymentDisplayItem => ({
  amount: id * 1_000,
  client_name: `客户 ${id}`,
  days_left: daysLeft,
  id,
  project_id: id + 100,
  project_name: `项目 ${id}`,
  status: daysLeft < 0 ? 'danger' : daysLeft < 7 ? 'warning' : 'success',
  ...overrides,
})

describe('ActionQueue', () => {
  it('sorts overdue, today, and upcoming payments by urgency', () => {
    render(<ActionQueue payments={[payment(1, 5), payment(2, 0), payment(3, -2), payment(4, 2)]} />)

    expect(screen.getByRole('heading', { level: 2, name: '待处理收款' })).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /项目/ })
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining('项目 3'),
      expect.stringContaining('项目 2'),
      expect.stringContaining('项目 4'),
      expect.stringContaining('项目 1'),
    ])
    expect(screen.getByText('逾期2天')).toBeInTheDocument()
    expect(screen.getByText('今日到期')).toBeInTheDocument()
    expect(screen.getByText('2天后')).toBeInTheDocument()
  })

  it('shows project, client, formatted amount, and a payment deep link', () => {
    render(
      <ActionQueue
        payments={[
          payment(8, 3, {
            amount: 12_345.6,
            client_name: '山岚工作室',
            project_id: 42,
            project_name: '极光网站',
          }),
        ]}
      />,
    )

    const link = screen.getByRole('link', { name: /极光网站/ })
    expect(link).toHaveAttribute('href', '/projects/42?tab=payments&payment=8')
    expect(link).toHaveTextContent('山岚工作室')
    expect(link).toHaveTextContent('¥12,345.60')
    expect(link).toHaveTextContent('3天后')
  })

  it('limits the queue to five items and links to the collection calendar', () => {
    render(
      <ActionQueue payments={Array.from({ length: 7 }, (_, index) => payment(index + 1, index))} />,
    )

    expect(screen.getAllByRole('link', { name: /项目/ })).toHaveLength(5)
    expect(screen.getByRole('link', { name: '查看全部' })).toHaveAttribute('href', '/calendar')
  })

  it('renders a positive empty state when there is nothing to collect', () => {
    render(<ActionQueue payments={[]} />)

    expect(screen.getByText('未来七天暂无待处理收款')).toBeInTheDocument()
    expect(screen.getByText('可以前往收款日历查看更远日期的计划。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看收款日历' })).toHaveAttribute('href', '/calendar')
  })
})
