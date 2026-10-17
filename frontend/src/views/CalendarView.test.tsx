import dayjs from 'dayjs'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paymentApi, type Payment } from '@/api/project'
import { render, screen, waitFor, within } from '@/test/render'
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
  plan_date: '2026-10-17',
  project: { name: '星轨项目' },
  project_id: 1,
  remark: '',
  stage: '中期款',
  status: 'pending',
} as Payment

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 17, 12))
    vi.clearAllMocks()
    vi.mocked(paymentApi.list).mockResolvedValue({ data: { data: [todayPayment] } } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    ['2026-10-17', '2026-10-17', '待收'],
    ['2026-10-17T00:00:00Z', '2026-10-17', '待收'],
    ['2026-10-17T00:00:00+08:00', '2026-10-17', '待收'],
    ['2026-10-17 00:00:00', '2026-10-17', '待收'],
    ['2026-10-01T00:00:00+14:00', '2026-10-01', '逾期'],
    ['2026-10-31T23:30:00-12:00', '2026-10-31', '待收'],
  ])('marks and selects the planned calendar day for %s', async (planDate, date, status) => {
    const user = userEvent.setup()
    vi.mocked(paymentApi.list).mockResolvedValue({
      data: { data: [{ ...todayPayment, plan_date: planDate }] },
    } as never)

    render(<CalendarView />)

    const markedDay = await screen.findByRole('button', {
      name: `${date}，收款计划状态：${status}`,
    })
    expect(markedDay).toHaveAttribute('data-marked', 'true')
    expect(screen.getByText(/应收 ¥12,800\.00/)).toBeInTheDocument()

    await user.click(markedDay)

    expect(markedDay).toHaveAttribute('data-selected', 'true')
    expect(screen.getAllByRole('link', { name: /星轨项目/ })).toHaveLength(2)
    expect(screen.queryByText('该日无收款计划')).not.toBeInTheDocument()
  })

  it.each([
    ['all', '全款'],
    ['deposit', '预付款'],
    ['final', '尾款'],
    ['milestone', '阶段款'],
    ['progress', '进度款'],
    ['process', '进度款'],
    ['验收款', '验收款'],
    ['', '收款'],
  ])('displays stage %s as %s in both payment lists', async (stage, label) => {
    vi.mocked(paymentApi.list).mockResolvedValue({
      data: { data: [{ ...todayPayment, stage }] },
    } as never)

    render(<CalendarView />)

    await waitFor(() => expect(screen.getAllByRole('link', { name: /星轨项目/ })).toHaveLength(2))
    expect(screen.getAllByText(label, { exact: true })).toHaveLength(2)
    if (stage && stage !== label) expect(screen.queryByText(stage)).not.toBeInTheDocument()
  })

  it('groups timestamp variants on one day and marks its most urgent payment', async () => {
    const user = userEvent.setup()
    const payments: Payment[] = [
      { ...todayPayment, id: 1, plan_date: '2026-10-16T00:00:00Z', status: 'paid' },
      { ...todayPayment, id: 2, plan_date: '2026-10-16T00:00:00+08:00', status: 'pending' },
      { ...todayPayment, id: 3, plan_date: '2026-10-16', status: 'confirmed' },
    ]
    vi.mocked(paymentApi.list).mockResolvedValue({ data: { data: payments } } as never)

    const { container } = render(<CalendarView />)

    const markedDay = await screen.findByRole('button', {
      name: '2026-10-16，收款计划状态：逾期',
    })
    expect(container.querySelectorAll('.ods-calendar__marker')).toHaveLength(1)
    expect(markedDay.querySelector('.ods-calendar__marker')).toHaveAttribute('data-tone', 'danger')

    await user.click(markedDay)

    expect(screen.getAllByRole('link', { name: /星轨项目/ })).toHaveLength(4)
    expect(screen.getByText(/已收 2 笔/)).toBeInTheDocument()
    expect(screen.getAllByText(/逾期 1 笔/)).toHaveLength(2)
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
    expect(screen.getByRole('button', { name: '本月' })).toHaveAttribute('data-variant', 'outline')
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
    expect(screen.getAllByText('暂不可用')).toHaveLength(5)
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

  it('previews the latest two payments in each scope while keeping complete counts and totals', async () => {
    const user = userEvent.setup()
    const payments: Payment[] = [
      { ...todayPayment, id: 1, project: { name: '较早记录' } as Payment['project'] },
      { ...todayPayment, id: 4, project: { name: '最新记录' } as Payment['project'] },
      { ...todayPayment, id: 2, project: { name: '第二条记录' } as Payment['project'] },
      {
        ...todayPayment,
        id: 3,
        plan_date: '2026-10-31',
        project: { name: '月底记录' } as Payment['project'],
      },
    ]
    vi.mocked(paymentApi.list).mockResolvedValue({ data: { data: payments } } as never)
    render(<CalendarView />)

    const day = within(screen.getByLabelText('选中日期收款', { selector: '.calendar-preview' }))
    const month = within(screen.getByLabelText('本月收款', { selector: '.calendar-preview' }))
    await waitFor(() => expect(day.getAllByRole('listitem')).toHaveLength(2))
    expect(day.getAllByRole('listitem')[0]).toHaveTextContent('最新记录')
    expect(day.getAllByRole('listitem')[1]).toHaveTextContent('第二条记录')
    expect(day.getByText('共 3 笔')).toBeInTheDocument()
    expect(month.getAllByRole('listitem')).toHaveLength(2)
    expect(month.getAllByRole('listitem')[0]).toHaveTextContent('月底记录')
    expect(month.getAllByRole('listitem')[1]).toHaveTextContent('最新记录')
    expect(month.getByText('共 4 笔')).toBeInTheDocument()
    expect(screen.queryByText('较早记录')).not.toBeInTheDocument()
    expect(screen.getByText(/应收 ¥51,200\.00/)).toBeInTheDocument()

    await user.click(day.getByRole('link', { name: '查看选中日期全部收款' }))
    expect(screen.getByRole('heading', { level: 1, name: '当日全部收款' })).toBeInTheDocument()
    const dayList = screen.getByRole('list', { name: '全部收款明细' })
    expect(within(dayList).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('共 3 笔 · 合计 ¥38,400.00')).toBeInTheDocument()
    expect(screen.getByText('较早记录')).toBeInTheDocument()
    expect(screen.queryByText('月底记录')).not.toBeInTheDocument()
    expect(within(dayList).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/projects/1?tab=payments&payment=4',
    )

    await user.click(screen.getByRole('link', { name: '返回收款日历' }))
    expect(screen.getByRole('button', { name: '2026-10-17，收款计划状态：待收' })).toHaveAttribute(
      'data-selected',
      'true',
    )
    await user.click(screen.getByRole('link', { name: '查看本月全部收款' }))
    expect(screen.getByRole('heading', { level: 1, name: '本月全部收款' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: '全部收款明细' })).getAllByRole('listitem'),
    ).toHaveLength(4)
    expect(screen.getByText('共 4 笔 · 合计 ¥51,200.00')).toBeInTheDocument()
    expect(paymentApi.list).toHaveBeenCalledTimes(1)
  })

  it('opens a linked month directly and returns to its original selected date', async () => {
    const user = userEvent.setup()
    vi.mocked(paymentApi.list).mockResolvedValue({
      data: { data: [{ ...todayPayment, plan_date: '2026-11-12T00:00:00Z' }] },
    } as never)
    render(<CalendarView />, { initialEntries: ['/calendar?date=2026-11-12&view=month'] })

    await screen.findByRole('list', { name: '全部收款明细' })
    expect(paymentApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: '2026-11-01',
        end_date: '2026-11-30',
      }),
    )
    await user.click(screen.getByRole('link', { name: '返回收款日历' }))
    expect(screen.getByRole('button', { name: '2026-11-12，收款计划状态：待收' })).toHaveAttribute(
      'data-selected',
      'true',
    )
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('11 月')
  })

  it('keeps the current month loaded when selecting a day and using the current-month action', async () => {
    const user = userEvent.setup()
    render(<CalendarView />)
    await screen.findAllByText('星轨项目')

    await user.click(screen.getByRole('button', { name: '2026-10-20' }))
    expect(screen.getByRole('link', { name: '查看选中日期全部收款' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.click(screen.getByRole('button', { name: '本月' }))
    expect(screen.getAllByText('星轨项目')).toHaveLength(2)
    expect(screen.queryByRole('status', { name: '正在加载收款计划' })).not.toBeInTheDocument()
    expect(paymentApi.list).toHaveBeenCalledTimes(1)
  })

  it('retries a directly linked full list after a loading error', async () => {
    const user = userEvent.setup()
    vi.mocked(paymentApi.list)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { data: [todayPayment] } } as never)
    render(<CalendarView />, { initialEntries: ['/calendar?date=2026-10-17&view=day'] })
    await screen.findByText('收款计划暂时不可用')
    await user.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByRole('list', { name: '全部收款明细' })).toBeInTheDocument()
  })
})
