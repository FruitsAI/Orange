import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { paymentApi, type Payment } from '@/api/project'
import { useToastStore } from '@/composables/useToast'
import {
  Calendar,
  Card,
  Chip,
  EmptyState,
  SectionHeader,
  Surface,
  type CalendarDayState,
  type ChipTone,
} from '@/design-system'
import { formatDate } from '@/utils/format'

const formatAmount = (amount: number) => amount.toLocaleString('zh-CN')

const formatStage = (payment: Payment) => payment.stage || '收款'

const formatDateShort = (date: string) => dayjs(date).format('MM-DD')

const getPaymentDateAriaLabel = (date: string, state: CalendarDayState) =>
  `${formatDate(date)}${state.isMarked ? '，有收款计划' : ''}`

const paymentStatus: Record<Payment['status'], { label: string; tone: ChipTone }> = {
  confirmed: { label: '已收', tone: 'success' },
  overdue: { label: '逾期', tone: 'danger' },
  paid: { label: '已收', tone: 'success' },
  pending: { label: '待收', tone: 'warning' },
}

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

  const handleVisibleMonthChange = useCallback((value: string) => {
    const nextMonth = dayjs(value).startOf('month')
    setCurrentMonth(nextMonth)
    setSelectedDate(nextMonth.format('YYYY-MM-DD'))
  }, [])

  const isPaymentDate = useCallback((date: string) => eventDates.has(date), [eventDates])

  return (
    <div className="calendar-view">
      <div className="main-layout grid gap-lg">
        <Calendar
          aria-label="收款日历"
          className="calendar-view__calendar"
          getDateAriaLabel={getPaymentDateAriaLabel}
          isDateMarked={isPaymentDate}
          layout="fluid"
          onValueChange={setSelectedDate}
          onVisibleMonthChange={handleVisibleMonthChange}
          showTodayAction
          todayActionLabel="本月"
          value={selectedDate}
          visibleMonth={currentMonth.format('YYYY-MM-DD')}
        />

        <div className="flex flex-col gap-md">
          <Card.Root variant="tertiary">
            <Card.Header>
              <SectionHeader
                description={formatDate(selectedDate)}
                headingLevel={3}
                title="选中日期收款"
              />
            </Card.Header>
            <Card.Content>
              {selectedDatePayments.length === 0 ? (
                <EmptyState
                  icon={<i className="ri-calendar-check-line" />}
                  title="该日无收款计划"
                />
              ) : (
                <div className="flex flex-col gap-sm">
                  {selectedDatePayments.map((payment) => (
                    <Surface
                      className="flex items-center justify-between gap-md"
                      key={payment.id}
                      padding="sm"
                      variant="inset"
                    >
                      <div>
                        <div className="font-medium text-sm">{formatStage(payment)}</div>
                        <div className="text-sm text-secondary">
                          {payment.project?.name || '未知项目'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-sm text-right">
                        <div className="font-semibold">¥{formatAmount(payment.amount)}</div>
                        <Chip size="sm" tone={paymentStatus[payment.status].tone}>
                          {paymentStatus[payment.status].label}
                        </Chip>
                      </div>
                    </Surface>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card.Root>

          <Card.Root variant="tertiary">
            <Card.Header>
              <Card.Title>近期收款</Card.Title>
            </Card.Header>
            <Card.Content>
              {monthlyPayments.length === 0 ? (
                <EmptyState
                  icon={<i className="ri-calendar-event-line" />}
                  title="本月无收款计划"
                />
              ) : (
                <div className="flex flex-col gap-sm">
                  {monthlyPayments.map((payment) => (
                    <Surface
                      className="flex items-center justify-between gap-md"
                      key={payment.id}
                      padding="sm"
                      variant="inset"
                    >
                      <div>
                        <div className="font-medium text-sm">{formatStage(payment)}</div>
                        <div className="text-sm text-secondary">
                          {payment.project?.name || '未知项目'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-sm text-right">
                        <div className="font-semibold">¥{formatAmount(payment.amount)}</div>
                        <Chip size="sm" tone={payment.status === 'overdue' ? 'danger' : 'neutral'}>
                          {formatDateShort(payment.plan_date)}
                        </Chip>
                      </div>
                    </Surface>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card.Root>
        </div>
      </div>
    </div>
  )
}
