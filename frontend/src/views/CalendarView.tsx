import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paymentApi, type Payment } from '@/api/project'
import { getEffectivePaymentStatus } from '@/components/project/projectCollection'
import { useToastStore } from '@/composables/useToast'
import {
  Button,
  Calendar,
  Card,
  Chip,
  DataList,
  EmptyState,
  PageHeader,
  RouterButton,
  SectionHeader,
  Skeleton,
  SummaryMetric,
  type CalendarDayState,
  type CalendarMarkTone,
  type SummaryMetricProps,
  type SurfaceTone,
} from '@/design-system'
import { formatCurrency, formatDate } from '@/utils/format'
import '@/styles/calendar-domain.css'

const formatStage = (payment: Payment) => {
  const labels: Record<string, string> = {
    all: '全款',
    deposit: '预付款',
    final: '尾款',
    milestone: '阶段款',
    progress: '进度款',
  }
  return labels[payment.stage] || payment.stage || '收款'
}

const paymentDateKey = (payment: Payment) => dayjs(payment.plan_date).format('YYYY-MM-DD')

const statusMeta: Record<Payment['status'], { label: string; tone: SurfaceTone }> = {
  confirmed: { label: '已收', tone: 'success' },
  overdue: { label: '逾期', tone: 'danger' },
  paid: { label: '已收', tone: 'success' },
  pending: { label: '待收', tone: 'warning' },
}

const getPaymentStatus = getEffectivePaymentStatus

// One mark per day, colored by the most urgent plan on it.
const TONE_PRIORITY: Record<Payment['status'], number> = {
  overdue: 3,
  pending: 2,
  confirmed: 1,
  paid: 1,
}

const STATUS_MARK: Record<Payment['status'], CalendarMarkTone> = {
  confirmed: 'success',
  overdue: 'danger',
  paid: 'success',
  pending: 'warning',
}

const paymentLink = (payment: Payment) =>
  `/projects/${payment.project_id}?tab=payments&payment=${payment.id}`

interface PaymentRowProps {
  payment: Payment
  secondary: string
  secondaryTone?: SurfaceTone
}

function PaymentRow({ payment, secondary, secondaryTone = 'neutral' }: PaymentRowProps) {
  const status = getPaymentStatus(payment)

  return (
    <DataList.Item data-motion-item>
      <DataList.Link
        density="comfortable"
        icon={<i className="ri-arrow-right-s-line" />}
        markerTone={statusMeta[status].tone}
        to={paymentLink(payment)}
      >
        <DataList.Identity>
          <DataList.Primary>{payment.project?.name || '未知项目'}</DataList.Primary>
          <DataList.Secondary>{formatStage(payment)}</DataList.Secondary>
        </DataList.Identity>
        <DataList.Meta align="end" numeric>
          <DataList.Primary>{formatCurrency(payment.amount)}</DataList.Primary>
          <DataList.Secondary tone={secondaryTone}>{secondary}</DataList.Secondary>
        </DataList.Meta>
      </DataList.Link>
    </DataList.Item>
  )
}

export default function CalendarView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const showOverdue = searchParams.get('view') === 'overdue'
  const toastError = useToastStore((state) => state.error)
  const [payments, setPayments] = useState<Payment[]>([])
  const [overduePayments, setOverduePayments] = useState<Payment[]>([])
  const [overdueLoading, setOverdueLoading] = useState(false)
  const [overdueError, setOverdueError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const mountedRef = useRef(false)
  const requestIdRef = useRef(0)

  const loadPayments = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const response = await paymentApi.list({
        _t: Date.now(),
        end_date: currentMonth.endOf('month').format('YYYY-MM-DD'),
        start_date: currentMonth.startOf('month').format('YYYY-MM-DD'),
      })
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setPayments(response.data.data)
      if (response.data.data.length > 0) {
        const firstPlanDate = paymentDateKey(response.data.data[0])
        const monthStart = currentMonth.format('YYYY-MM-DD')
        if (dayjs(firstPlanDate).isSame(currentMonth, 'month')) {
          setSelectedDate((current) => (current === monthStart ? firstPlanDate : current))
        }
      }
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setPayments([])
      setLoadError(true)
      toastError('获取收款日历失败')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false)
    }
  }, [currentMonth, toastError])

  useEffect(() => {
    mountedRef.current = true
    const timer = window.setTimeout(loadPayments, 0)
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      window.clearTimeout(timer)
    }
  }, [loadPayments])

  const loadOverduePayments = useCallback(async () => {
    setOverdueLoading(true)
    setOverdueError(false)
    try {
      const response = await paymentApi.overdue()
      if (!mountedRef.current) return
      setOverduePayments(response.data.data)
    } catch {
      if (!mountedRef.current) return
      setOverdueError(true)
      toastError('获取逾期收款失败')
    } finally {
      if (mountedRef.current) setOverdueLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    if (!showOverdue) return
    const timer = window.setTimeout(() => void loadOverduePayments(), 0)
    return () => window.clearTimeout(timer)
  }, [loadOverduePayments, showOverdue])

  const dateTones = useMemo(() => {
    const tones = new Map<string, Payment['status']>()
    for (const payment of payments) {
      const status = getPaymentStatus(payment)
      const date = paymentDateKey(payment)
      const current = tones.get(date)
      if (!current || TONE_PRIORITY[status] > TONE_PRIORITY[current]) {
        tones.set(date, status)
      }
    }
    return tones
  }, [payments])

  const selectedDatePayments = useMemo(
    () => payments.filter((payment) => paymentDateKey(payment) === selectedDate),
    [payments, selectedDate],
  )

  const dateCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const payment of payments) {
      const date = paymentDateKey(payment)
      counts.set(date, (counts.get(date) || 0) + 1)
    }
    return counts
  }, [payments])

  const monthlyPayments = useMemo(
    () =>
      payments
        .filter((payment) => dayjs(payment.plan_date).isSame(currentMonth, 'month'))
        .sort((a, b) => a.plan_date.localeCompare(b.plan_date)),
    [currentMonth, payments],
  )

  const monthSummary = useMemo(() => {
    const total = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const count = (status: 'pending' | 'overdue') =>
      monthlyPayments.filter((payment) => getPaymentStatus(payment) === status).length
    const received = monthlyPayments.filter(
      (payment) => payment.status === 'paid' || payment.status === 'confirmed',
    ).length
    const receivedAmount = monthlyPayments
      .filter((payment) => payment.status === 'paid' || payment.status === 'confirmed')
      .reduce((sum, payment) => sum + payment.amount, 0)
    return {
      overdue: count('overdue'),
      pending: count('pending'),
      received,
      receivedAmount,
      total,
    }
  }, [monthlyPayments])

  const handleVisibleMonthChange = useCallback((value: string) => {
    const nextMonth = dayjs(value).startOf('month')
    setLoading(true)
    setLoadError(false)
    setCurrentMonth(nextMonth)
    setSelectedDate(nextMonth.format('YYYY-MM-DD'))
  }, [])

  const getDateTone = useCallback(
    (date: string) => {
      const status = dateTones.get(date)
      return status ? STATUS_MARK[status] : undefined
    },
    [dateTones],
  )

  const getDateAriaLabel = useCallback(
    (date: string, state: CalendarDayState) => {
      const status = dateTones.get(date)
      const count = dateCounts.get(date) || 0
      return `${formatDate(date)}${state.isMarked && status ? `，${count}笔收款计划，最紧急状态：${statusMeta[status].label}` : ''}`
    },
    [dateCounts, dateTones],
  )

  const summaryText = loadError
    ? `${currentMonth.month() + 1} 月收款计划加载失败`
    : loading
      ? '正在同步收款计划…'
      : monthlyPayments.length === 0
        ? `${currentMonth.month() + 1} 月暂无收款计划`
        : `${currentMonth.month() + 1} 月应收 ${formatCurrency(monthSummary.total)} · 待收 ${
            monthSummary.pending
          } 笔${
            monthSummary.overdue > 0 ? ` · 逾期 ${monthSummary.overdue} 笔` : ''
          } · 已收 ${monthSummary.received} 笔`
  const overdueSummaryText = overdueLoading
    ? '正在汇总逾期款项…'
    : overdueError
      ? '逾期款项暂不可用'
      : `${overduePayments.length} 笔逾期待收 · 合计 ${formatCurrency(
          overduePayments.reduce((sum, payment) => sum + payment.amount, 0),
        )}`

  const metricState = (value: string) =>
    loadError
      ? ({ errorValue: '暂不可用', status: 'error' } as const)
      : loading
        ? ({ loadingValue: '—', status: 'loading' } as const)
        : ({ status: 'data', value } as const)

  const summaryMetrics: SummaryMetricProps[] = [
    {
      label: `${currentMonth.month() + 1} 月应收`,
      layout: 'stacked',
      meta: (
        <Chip size="sm" tone={loadError ? 'neutral' : 'accent'}>
          {loadError ? '加载失败' : loading ? '同步中' : `${monthlyPayments.length} 笔计划`}
        </Chip>
      ),
      tone: loadError ? 'neutral' : 'accent',
      variant: 'default',
      ...metricState(formatCurrency(monthSummary.total)),
    },
    {
      label: '风险关注',
      layout: 'stacked',
      meta: (
        <Chip
          size="sm"
          tone={loadError ? 'neutral' : monthSummary.overdue > 0 ? 'danger' : 'warning'}
        >
          {loadError
            ? '加载失败'
            : loading
              ? '同步中'
              : monthSummary.overdue > 0
                ? `逾期 ${monthSummary.overdue} 笔`
                : '暂无逾期'}
        </Chip>
      ),
      tone: loadError ? 'neutral' : monthSummary.overdue > 0 ? 'danger' : 'warning',
      variant: 'default',
      ...metricState(`${monthSummary.pending + monthSummary.overdue} 笔`),
    },
    {
      label: '已收回款',
      layout: 'stacked',
      meta: (
        <Chip size="sm" tone={loadError ? 'neutral' : 'success'}>
          {loadError ? '加载失败' : loading ? '同步中' : `${monthSummary.received} 笔已确认`}
        </Chip>
      ),
      tone: loadError ? 'neutral' : 'success',
      variant: 'default',
      ...metricState(formatCurrency(monthSummary.receivedAmount)),
    },
  ]

  return (
    <div className="calendar-view" data-motion-scope="calendar">
      <PageHeader
        description={showOverdue ? overdueSummaryText : summaryText}
        title={showOverdue ? '逾期收款' : '收款日历'}
      />

      {showOverdue ? (
        <section aria-label="逾期待收款" className="calendar-overdue-board">
          <div className="calendar-overdue-board__header">
            <div>
              <span className="calendar-overdue-board__eyebrow">待处理</span>
              <h2>逾期待收款</h2>
              <p>按到期时间排序，从最早的款项开始跟进。</p>
            </div>
            <Button onClick={() => setSearchParams({})} size="sm" variant="secondary">
              返回月历
            </Button>
          </div>
          {overdueLoading ? (
            <div aria-label="正在加载逾期收款" role="status"><Skeleton height="8rem" /></div>
          ) : overdueError ? (
            <EmptyState
              action={<Button onClick={() => void loadOverduePayments()} size="sm">重试</Button>}
              title="逾期收款暂时无法加载"
            />
          ) : overduePayments.length === 0 ? (
            <EmptyState title="暂无逾期待收款" description="当前没有需要跟进的逾期款项。" />
          ) : (
            <DataList.Root as="ol">
              {overduePayments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  secondary={`${formatDate(payment.plan_date)} · 逾期${dayjs().diff(dayjs(payment.plan_date), 'day')}天`}
                  secondaryTone="danger"
                />
              ))}
            </DataList.Root>
          )}
        </section>
      ) : null}

      {!showOverdue ? <div className="calendar-summary" data-motion-group="summary">
        {summaryMetrics.map((metric) => (
          <SummaryMetric key={String(metric.label)} {...metric} />
        ))}
      </div> : null}

      {!showOverdue ? <div className="calendar-view__layout" data-motion="entrance">
        <section aria-label="收款日历" className="calendar-board">
          <Calendar
            aria-busy={loading}
            aria-label="收款日历"
            className="calendar-view__calendar"
            getDateAriaLabel={getDateAriaLabel}
            getDateCount={(date) => dateCounts.get(date) || 0}
            getDateTone={getDateTone}
            layout="fluid"
            onValueChange={setSelectedDate}
            onVisibleMonthChange={handleVisibleMonthChange}
            showTodayAction
            todayActionLabel="本月"
            value={selectedDate}
            variant="tertiary"
            visibleMonth={currentMonth.format('YYYY-MM-DD')}
          />
          <div aria-label="收款状态图例" className="calendar-legend" role="group">
            <span className="calendar-legend__label">计划状态</span>
            <Chip size="sm" tone="success">
              <i aria-hidden="true" className="ri-checkbox-circle-line" />
              已收
            </Chip>
            <Chip size="sm" tone="warning">
              <i aria-hidden="true" className="ri-time-line" />
              待收
            </Chip>
            <Chip size="sm" tone="danger">
              <i aria-hidden="true" className="ri-error-warning-line" />
              逾期
            </Chip>
          </div>
        </section>

        <div className="calendar-view__detail-stack" data-motion-group="calendar-detail">
          <Card.Root aria-busy={loading} data-motion="entrance" variant="tertiary">
            <Card.Header>
              <SectionHeader
                description={formatDate(selectedDate)}
                headingLevel={2}
                title="选中日期收款"
              />
            </Card.Header>
            <Card.Content>
              {loading ? (
                <div aria-label="正在加载收款计划" className="calendar-loading-list" role="status">
                  <Skeleton height="3.75rem" />
                  <Skeleton height="3.75rem" />
                </div>
              ) : loadError ? (
                <EmptyState
                  action={
                    <Button onClick={() => void loadPayments()} size="sm" variant="ghost">
                      重试
                    </Button>
                  }
                  icon={<i className="ri-wifi-off-line" />}
                  size="sm"
                  title="收款计划暂时不可用"
                />
              ) : selectedDatePayments.length === 0 ? (
                <EmptyState
                  icon={<i className="ri-calendar-check-line" />}
                  size="sm"
                  title="该日无收款计划"
                />
              ) : (
                <div className="calendar-selection-content" key={selectedDate}>
                  <DataList.Root>
                    {selectedDatePayments.map((payment) => (
                      <PaymentRow
                        key={payment.id}
                        payment={payment}
                        secondary={statusMeta[getPaymentStatus(payment)].label}
                        secondaryTone={statusMeta[getPaymentStatus(payment)].tone}
                      />
                    ))}
                  </DataList.Root>
                </div>
              )}
            </Card.Content>
          </Card.Root>

          <Card.Root aria-busy={loading} data-motion="entrance" variant="tertiary">
            <Card.Header>
              <SectionHeader description="按计划日期排序" headingLevel={2} title="本月收款" />
            </Card.Header>
            <Card.Content>
              {loading ? (
                <div
                  aria-label="正在加载本月收款计划"
                  className="calendar-loading-list"
                  role="status"
                >
                  <Skeleton height="3.75rem" />
                  <Skeleton height="3.75rem" />
                  <Skeleton height="3.75rem" />
                </div>
              ) : loadError ? (
                <EmptyState
                  action={
                    <Button onClick={() => void loadPayments()} size="sm" variant="ghost">
                      重试
                    </Button>
                  }
                  icon={<i className="ri-wifi-off-line" />}
                  size="sm"
                  title="收款计划暂时不可用"
                />
              ) : monthlyPayments.length === 0 ? (
                <EmptyState
                  action={
                    <RouterButton size="sm" to="/calendar?view=overdue" variant="secondary">
                      查看逾期款项
                    </RouterButton>
                  }
                  description="本月没有计划，可查看其他月份或先处理逾期款项。"
                  icon={<i className="ri-calendar-event-line" />}
                  size="sm"
                  title="本月无收款计划"
                />
              ) : (
                <div className="calendar-selection-content" key={currentMonth.format('YYYY-MM')}>
                  <DataList.Root>
                    {monthlyPayments.map((payment) => (
                      <PaymentRow
                        key={payment.id}
                        payment={payment}
                        secondary={`${dayjs(payment.plan_date).format('MM-DD')} · ${
                          statusMeta[getPaymentStatus(payment)].label
                        }`}
                        secondaryTone={
                          getPaymentStatus(payment) === 'overdue' ? 'danger' : 'neutral'
                        }
                      />
                    ))}
                  </DataList.Root>
                </div>
              )}
            </Card.Content>
          </Card.Root>
        </div>
      </div> : null}
    </div>
  )
}
