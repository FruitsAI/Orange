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
    expect(paymentApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
        start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
      }),
    )
    expect(screen.getAllByText('中期款')).toHaveLength(2)
    expect(container.querySelectorAll('.calendar-view__detail-stack > .ods-card')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-summary-metric')).toHaveLength(3)
    const calendar = container.querySelector('.ods-calendar')
    expect(calendar).toHaveAttribute('data-layout', 'fluid')
    expect(calendar).toHaveAttribute('data-variant', 'tertiary')
    expect(screen.getByRole('button', { name: '本月' })).toHaveAttribute(
      'data-variant',
      'outline',
    )
    expect(container.querySelector('.calendar-day')).not.toBeInTheDocument()
    expect(container.querySelector('.glass-card')).not.toBeInTheDocument()
    expect(container.querySelector('.btn')).not.toBeInTheDocument()

    // Month summary in the page header.
    expect(screen.getByRole('heading', { level: 1, name: '收款日历' })).toBeInTheDocument()
    expect(screen.getByText(/应收 ¥12,800\.00 · 待收 1 笔/)).toBeInTheDocument()

    // Payment rows are DataList links into the owning project.
    const rows = container.querySelectorAll('.ods-data-list__link')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveAttribute('href', '/projects/1?tab=payments&payment=1')
    expect(rows[0]).toHaveAttribute('data-marker-tone', 'warning')

    // The plan date carries a status-toned mark.
    const markedDay = screen.getByRole('button', {
      name: `${todayPayment.plan_date}，收款计划状态：待收`,
    })
    expect(markedDay).toHaveAccessibleName(`${todayPayment.plan_date}，收款计划状态：待收`)
    expect(markedDay).toHaveAttribute('data-marked', 'true')
    expect(markedDay.querySelector('.ods-calendar__marker')).toHaveAttribute('data-tone', 'warning')

    const nextMonth = dayjs().add(1, 'month')
    await user.click(screen.getByRole('button', { name: '下个月' }))

    await waitFor(() => expect(paymentApi.list).toHaveBeenCalledTimes(2))
    expect(paymentApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        end_date: nextMonth.endOf('month').format('YYYY-MM-DD'),
        start_date: nextMonth.startOf('month').format('YYYY-MM-DD'),
      }),
    )

    expect(screen.getByRole('button', { name: '选择年份' })).toHaveTextContent(
      `${nextMonth.year()} 年`,
    )
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent(
      `${nextMonth.month() + 1} 月`,
    )
    expect(screen.getByText('该日无收款计划')).toBeInTheDocument()
    expect(screen.getByText(`${nextMonth.month() + 1} 月暂无收款计划`)).toBeInTheDocument()
  })

  it('derives overdue plans from a pending status and a past plan date', async () => {
    const user = userEvent.setup()
    const overdueDate = dayjs().subtract(1, 'day')
    const overduePayment = {
      ...todayPayment,
      id: 2,
      plan_date: overdueDate.format('YYYY-MM-DD'),
    }
    vi.mocked(paymentApi.list).mockResolvedValue({ data: { data: [overduePayment] } } as never)

    render(<CalendarView />)

    if (!overdueDate.isSame(dayjs(), 'month')) {
      await user.click(screen.getByRole('button', { name: '上个月' }))
    }

    await waitFor(() => expect(screen.getAllByText(/逾期 1 笔/)).toHaveLength(2))
    const markedDay = screen.getByRole('button', {
      name: `${overduePayment.plan_date}，收款计划状态：逾期`,
    })
    expect(markedDay.querySelector('.ods-calendar__marker')).toHaveAttribute('data-tone', 'danger')
  })

  it('shows an unavailable state on failure and retries the visible month', async () => {
    const user = userEvent.setup()
    vi.mocked(paymentApi.list)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ data: { data: [todayPayment] } } as never)

    render(<CalendarView />)

    await waitFor(() => expect(screen.getAllByText('收款计划暂时不可用')).toHaveLength(2))
    expect(screen.getByText(`${dayjs().month() + 1} 月收款计划加载失败`)).toBeInTheDocument()
    expect(screen.getAllByText('暂不可用')).toHaveLength(3)
    expect(screen.queryByText('¥0.00')).not.toBeInTheDocument()
    expect(screen.queryByText(`${dayjs().month() + 1} 月暂无收款计划`)).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '重试' })[0])

    await waitFor(() => expect(screen.getAllByText('星轨项目')).toHaveLength(2))
    expect(paymentApi.list).toHaveBeenCalledTimes(2)
    expect(paymentApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
        start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
      }),
    )
    expect(screen.queryByText('收款计划暂时不可用')).not.toBeInTheDocument()
  })
})
