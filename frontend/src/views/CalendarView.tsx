import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paymentApi, type Payment } from '@/api/project'
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

const paymentStageLabels: Record<string, string> = {
  all: '全款',
  deposit: '预付款',
  final: '尾款',
  milestone: '阶段款',
  process: '进度款',
  progress: '进度款',
}

const formatStage = (payment: Payment) =>
  paymentStageLabels[payment.stage] || payment.stage || '收款'

const statusMeta: Record<Payment['status'], { label: string; tone: SurfaceTone }> = {
  confirmed: { label: '已收', tone: 'success' },
  overdue: { label: '逾期', tone: 'danger' },
  paid: { label: '已收', tone: 'success' },
  pending: { label: '待收', tone: 'warning' },
}

const getPaymentStatus = (payment: Payment): Payment['status'] => {
  const planDate = dayjs(payment.plan_date)
  return payment.status === 'pending' && planDate.isValid() && planDate.isBefore(dayjs(), 'day')
    ? 'overdue'
    : payment.status
}

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

const PREVIEW_LIMIT = 2
const newestPaymentFirst = (a: Payment, b: Payment) =>
  b.plan_date.localeCompare(a.plan_date) || b.id - a.id

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
  const toastError = useToastStore((state) => state.error)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const dateParam = searchParams.get('date') || ''
  const selectedDate =
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dayjs(dateParam).format('YYYY-MM-DD') === dateParam
      ? dateParam
      : dayjs().format('YYYY-MM-DD')
  const monthKey = selectedDate.slice(0, 7)
  const currentMonth = useMemo(() => dayjs(`${monthKey}-01`), [monthKey])
  const listScope = searchParams.get('view')
  const showAllPayments = listScope === 'day' || listScope === 'month'
  const setSelectedDate = useCallback(
    (value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('date', value)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
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
      setPayments(
        response.data.data.map((payment) => ({
          ...payment,
          // Go serializes this date-only field as a timestamp; keep its calendar day in any timezone.
          plan_date: payment.plan_date.slice(0, 10),
        })),
      )
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

  const dateTones = useMemo(() => {
    const tones = new Map<string, Payment['status']>()
    for (const payment of payments) {
      const status = getPaymentStatus(payment)
      const current = tones.get(payment.plan_date)
      if (!current || TONE_PRIORITY[status] > TONE_PRIORITY[current]) {
        tones.set(payment.plan_date, status)
      }
    }
    return tones
  }, [payments])

  const selectedDatePayments = useMemo(
    () => payments.filter((payment) => payment.plan_date === selectedDate).sort(newestPaymentFirst),
    [payments, selectedDate],
  )

  const monthlyPayments = useMemo(
    () =>
      payments
        .filter((payment) => dayjs(payment.plan_date).isSame(currentMonth, 'month'))
        .sort(newestPaymentFirst),
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

  const handleVisibleMonthChange = useCallback(
    (value: string) => {
      const nextMonth = dayjs(value).startOf('month')
      if (nextMonth.format('YYYY-MM') !== monthKey) {
        setLoading(true)
        setLoadError(false)
      }
      setSelectedDate(nextMonth.format('YYYY-MM-DD'))
    },
    [monthKey, setSelectedDate],
  )

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
      return `${formatDate(date)}${state.isMarked && status ? `，收款计划状态：${statusMeta[status].label}` : ''}`
    },
    [dateTones],
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

  if (showAllPayments) {
    const listedPayments = listScope === 'day' ? selectedDatePayments : monthlyPayments
    const period =
      listScope === 'day' ? formatDate(selectedDate) : currentMonth.format('YYYY 年 M 月')
    return (
      <div className="calendar-view" data-motion-scope="calendar">
        <PageHeader
          actions={
            <RouterButton to={`/calendar?date=${selectedDate}`} variant="outline">
              <i aria-hidden="true" className="ri-arrow-left-line" />
              返回收款日历
            </RouterButton>
          }
          description={`${period} · 按计划日期从新到旧`}
          title={listScope === 'day' ? '当日全部收款' : '本月全部收款'}
        />
        <Card.Root aria-busy={loading} variant="tertiary">
          <Card.Header>
            <SectionHeader
              description={
                loadError
                  ? '收款计划加载失败'
                  : loading
                    ? '正在同步收款计划…'
                    : `共 ${listedPayments.length} 笔 · 合计 ${formatCurrency(listedPayments.reduce((sum, payment) => sum + payment.amount, 0))}`
              }
              headingLevel={2}
              title="收款明细"
            />
          </Card.Header>
          <Card.Content>
            {loading ? (
              <div
                aria-label="正在加载全部收款计划"
                className="calendar-loading-list"
                role="status"
              >
                <Skeleton height="3.75rem" />
                <Skeleton height="3.75rem" />
              </div>
            ) : loadError ? (
              <EmptyState
                action={
                  <Button onClick={() => void loadPayments()} variant="ghost">
                    重试
                  </Button>
                }
                icon={<i className="ri-wifi-off-line" />}
                title="收款计划暂时不可用"
              />
            ) : listedPayments.length === 0 ? (
              <EmptyState
                icon={<i className="ri-calendar-check-line" />}
                title={listScope === 'day' ? '该日无收款计划' : '本月无收款计划'}
              />
            ) : (
              <DataList.Root aria-label="全部收款明细">
                {listedPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    secondary={`${formatDate(payment.plan_date)} · ${statusMeta[getPaymentStatus(payment)].label}`}
                    secondaryTone={statusMeta[getPaymentStatus(payment)].tone}
                  />
                ))}
              </DataList.Root>
            )}
          </Card.Content>
        </Card.Root>
      </div>
    )
  }

  return (
    <div className="calendar-view" data-motion-scope="calendar">
      <PageHeader description={summaryText} title="收款日历" />

      <div className="calendar-summary" data-motion-group="summary">
        {summaryMetrics.map((metric) => (
          <SummaryMetric key={String(metric.label)} {...metric} />
        ))}
      </div>

      <div className="calendar-view__layout" data-motion="entrance">
        <section aria-label="收款日历" className="calendar-board">
          <Calendar
            aria-busy={loading}
            aria-label="收款日历"
            className="calendar-view__calendar"
            getDateAriaLabel={getDateAriaLabel}
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
        </section>

        <div className="calendar-view__detail-stack">
          <Card.Root
            aria-busy={loading}
            aria-label="选中日期收款"
            className="calendar-preview"
            data-motion="entrance"
            variant="tertiary"
          >
            <Card.Header>
              <SectionHeader
                description={formatDate(selectedDate)}
                headingLevel={2}
                title="选中日期收款"
              />
            </Card.Header>
            <Card.Content className="calendar-preview__content">
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
                    {selectedDatePayments.slice(0, PREVIEW_LIMIT).map((payment) => (
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
            <Card.Footer className="calendar-preview__footer">
              <span className="calendar-preview__count">
                {loadError
                  ? '暂不可用'
                  : loading
                    ? '同步中…'
                    : `共 ${selectedDatePayments.length} 笔`}
              </span>
              <RouterButton
                aria-label="查看选中日期全部收款"
                disabled={loading || loadError || selectedDatePayments.length === 0}
                size="sm"
                to={`/calendar?date=${selectedDate}&view=day`}
                variant="ghost"
              >
                查看全部 <i aria-hidden="true" className="ri-arrow-right-line" />
              </RouterButton>
            </Card.Footer>
          </Card.Root>

          <Card.Root
            aria-busy={loading}
            aria-label="本月收款"
            className="calendar-preview"
            data-motion="entrance"
            variant="tertiary"
          >
            <Card.Header>
              <SectionHeader
                description="最近两笔 · 按计划日期从新到旧"
                headingLevel={2}
                title="本月收款"
              />
            </Card.Header>
            <Card.Content className="calendar-preview__content">
              {loading ? (
                <div
                  aria-label="正在加载本月收款计划"
                  className="calendar-loading-list"
                  role="status"
                >
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
                  icon={<i className="ri-calendar-event-line" />}
                  size="sm"
                  title="本月无收款计划"
                />
              ) : (
                <div className="calendar-selection-content" key={currentMonth.format('YYYY-MM')}>
                  <DataList.Root>
                    {monthlyPayments.slice(0, PREVIEW_LIMIT).map((payment) => (
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
            <Card.Footer className="calendar-preview__footer">
              <span className="calendar-preview__count">
                {loadError ? '暂不可用' : loading ? '同步中…' : `共 ${monthlyPayments.length} 笔`}
              </span>
              <RouterButton
                aria-label="查看本月全部收款"
                disabled={loading || loadError || monthlyPayments.length === 0}
                size="sm"
                to={`/calendar?date=${selectedDate}&view=month`}
                variant="ghost"
              >
                查看全部 <i aria-hidden="true" className="ri-arrow-right-line" />
              </RouterButton>
            </Card.Footer>
          </Card.Root>
        </div>
        <div aria-label="收款状态图例" className="calendar-legend" role="group">
          <span className="calendar-legend__label">计划状态</span>
          <Chip size="sm" tone="success">
            <i aria-hidden="true" className="ri-checkbox-circle-line" /> 已收
          </Chip>
          <Chip size="sm" tone="warning">
            <i aria-hidden="true" className="ri-time-line" /> 待收
          </Chip>
          <Chip size="sm" tone="danger">
            <i aria-hidden="true" className="ri-error-warning-line" /> 逾期
          </Chip>
        </div>
      </div>
    </div>
  )
}
