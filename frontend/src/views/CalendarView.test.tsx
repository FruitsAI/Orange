import dayjs from 'dayjs'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { paymentApi, type Payment } from '@/api/project'
import { render, screen, waitFor } from '@/test/render'
import CalendarView from './CalendarView'

vi.mock('@/api/project', () => ({
  paymentApi: {
    list: vi.fn(),
  },
}))

const todayPayment = {
  actual_date: '',
  amount: 12_800,
  id: 1,
  method: '',
  percentage: 40,
  plan_date: dayjs().format('YYYY-MM-DD'),
  project: { name: '星轨项目' },
  project_id: 1,
  remark: '',
  stage: '中期款',
  status: 'pending',
} as Payment

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(paymentApi.list).mockResolvedValue({ data: { data: [todayPayment] } } as never)
  })

  it('composes the calendar from Orange Design System surfaces and controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<CalendarView />)

    await waitFor(() => expect(screen.getAllByText('星轨项目')).toHaveLength(2))
    expect(screen.getAllByText('中期款')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-card')).toHaveLength(2)
    expect(container.querySelector('.ods-calendar')).toHaveAttribute('data-layout', 'fluid')
    expect(container.querySelector('.calendar-day')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.ods-chip').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('.glass-card')).not.toBeInTheDocument()
    expect(container.querySelector('.btn')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `${todayPayment.plan_date}，有收款计划`,
      }),
    ).toHaveAttribute('data-marked', 'true')

    const nextMonth = dayjs().add(1, 'month')
    await user.click(screen.getByRole('button', { name: '下个月' }))

    expect(screen.getByRole('button', { name: '选择年份' })).toHaveTextContent(
      `${nextMonth.year()} 年`,
    )
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent(
      `${nextMonth.month() + 1} 月`,
    )
    expect(screen.getByText('该日无收款计划')).toBeInTheDocument()
  })
})
