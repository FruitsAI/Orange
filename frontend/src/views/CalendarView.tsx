import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { paymentApi, type Payment } from '@/api/project'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

interface CalendarDay {
  dateStr: string
  day: number
  hasEvent: boolean
  isToday: boolean
  type: 'current' | 'next' | 'prev'
}

const formatAmount = (amount: number) => amount.toLocaleString('zh-CN')

const formatStage = (payment: Payment) => payment.stage || '收款'

const formatDateShort = (date: string) => dayjs(date).format('MM-DD')

export default function CalendarView() {
  const toastError = useToastStore((state) => state.error)
  const [payments, setPayments] = useState<Payment[]>([])
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))

  const loadPayments = useCallback(async () => {
    try {
      const response = await paymentApi.list({ _t: Date.now() })
      setPayments(response.data.data)
    } catch {
      toastError('获取收款日历失败')
    }
  }, [toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadPayments, 0)
    return () => window.clearTimeout(timer)
  }, [loadPayments])

  const eventDates = useMemo(
    () => new Set(payments.map((payment) => payment.plan_date)),
    [payments],
  )

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const firstDay = currentMonth.startOf('month')
    const daysInMonth = currentMonth.daysInMonth()
    const startWeekday = firstDay.day()
    const today = dayjs().format('YYYY-MM-DD')
    const days: CalendarDay[] = []

    const prevMonth = currentMonth.subtract(1, 'month')
    const prevMonthDays = prevMonth.daysInMonth()
    for (let index = startWeekday - 1; index >= 0; index -= 1) {
      const date = prevMonth.date(prevMonthDays - index)
      const dateStr = date.format('YYYY-MM-DD')
      days.push({
        dateStr,
        day: date.date(),
        hasEvent: eventDates.has(dateStr),
        isToday: dateStr === today,
        type: 'prev',
      })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = currentMonth.date(day)
      const dateStr = date.format('YYYY-MM-DD')
      days.push({
        dateStr,
        day,
        hasEvent: eventDates.has(dateStr),
        isToday: dateStr === today,
        type: 'current',
      })
    }

    const nextCount = (7 - (days.length % 7)) % 7
    const nextMonth = currentMonth.add(1, 'month')
    for (let day = 1; day <= nextCount; day += 1) {
      const date = nextMonth.date(day)
      const dateStr = date.format('YYYY-MM-DD')
      days.push({
        dateStr,
        day,
        hasEvent: eventDates.has(dateStr),
        isToday: dateStr === today,
        type: 'next',
      })
    }

    return days
  }, [currentMonth, eventDates])

  const selectedDatePayments = useMemo(
    () => payments.filter((payment) => payment.plan_date === selectedDate),
    [payments, selectedDate],
  )

  const monthlyPayments = useMemo(
    () =>
      payments
        .filter((payment) => dayjs(payment.plan_date).isSame(currentMonth, 'month'))
        .sort((a, b) => a.plan_date.localeCompare(b.plan_date)),
    [currentMonth, payments],
  )

  const changeMonth = (delta: number) => {
    const nextMonth = currentMonth.add(delta, 'month')
    setCurrentMonth(nextMonth)
    setSelectedDate(nextMonth.startOf('month').format('YYYY-MM-DD'))
  }

  const setToday = () => {
    const today = dayjs()
    setCurrentMonth(today.startOf('month'))
    setSelectedDate(today.format('YYYY-MM-DD'))
  }

  return (
    <div className="calendar-view">
      <div className="main-layout grid gap-lg">
        <GlassCard>
          <div className="glass-card-header mb-md">
            <div className="flex items-center gap-md">
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => changeMonth(-1)}
                type="button"
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              <h3 className="glass-card-title text-lg">
                {currentMonth.year()}年{currentMonth.month() + 1}月
              </h3>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => changeMonth(1)}
                type="button"
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
            <div className="flex gap-sm">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => changeMonth(-1)}
                type="button"
              >
                上月
              </button>
              <button className="btn btn-secondary btn-sm" onClick={setToday} type="button">
                本月
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} type="button">
                下月
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center mb-4">
            {weekDays.map((day) => (
              <div className="text-sm text-secondary font-medium p-sm" key={day}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1" id="calendarGrid">
            {calendarDays.map((item) => (
              <button
                className={`calendar-day ${item.type !== 'current' ? 'text-tertiary' : ''} ${
                  item.isToday ? 'today' : ''
                } ${item.dateStr === selectedDate ? 'selected' : ''}`}
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                type="button"
              >
                {item.day}
                {item.hasEvent ? <span className="event-dot" /> : null}
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-md">
          <GlassCard>
            <div className="glass-card-header">
              <h3 className="glass-card-title">选中日期收款</h3>
              <span className="text-sm text-secondary">{formatDate(selectedDate)}</span>
            </div>
            {selectedDatePayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-lg text-center">
                <i className="ri-calendar-check-line text-4xl text-tertiary mb-md" />
                <p className="text-secondary">该日无收款计划</p>
              </div>
            ) : (
              <div className="flex flex-col gap-sm p-sm">
                {selectedDatePayments.map((payment) => (
                  <div
                    className="flex items-center justify-between p-sm rounded-md border border-transparent bg-soft"
                    key={payment.id}
                  >
                    <div>
                      <div className="font-medium text-sm">{formatStage(payment)}</div>
                      <div className="text-sm text-secondary">
                        {payment.project?.name || '未知项目'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">¥{formatAmount(payment.amount)}</div>
                      <div
                        className={`text-sm ${payment.status === 'overdue' ? 'text-danger' : 'text-secondary'}`}
                      >
                        {payment.status === 'paid' || payment.status === 'confirmed'
                          ? '已收'
                          : payment.status === 'overdue'
                            ? '逾期'
                            : '待收'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="glass-card-header mb-md">
              <h3 className="glass-card-title">近期收款</h3>
            </div>
            <div className="flex flex-col gap-sm">
              {monthlyPayments.map((payment) => (
                <div
                  className={`flex items-center justify-between p-sm rounded-md border border-transparent hover:bg-bg-hover transition-colors ${
                    payment.status === 'overdue' ? 'bg-danger-soft' : ''
                  }`}
                  key={payment.id}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  <div>
                    <div className="font-medium text-sm">{formatStage(payment)}</div>
                    <div className="text-sm text-secondary">{payment.project?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">¥{formatAmount(payment.amount)}</div>
                    <div
                      className={`text-sm ${payment.status === 'overdue' ? 'text-danger' : 'text-secondary'}`}
                    >
                      {formatDateShort(payment.plan_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {monthlyPayments.length === 0 ? (
              <div className="text-center text-secondary py-md text-sm">本月无收款计划</div>
            ) : null}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
