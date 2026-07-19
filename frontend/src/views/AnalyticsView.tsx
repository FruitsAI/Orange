import type { ChartConfiguration } from 'chart.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type DashboardStats, type IncomeTrend } from '@/api/dashboard'
import Chart from '@/config/chart'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
  Skeleton,
  SummaryMetric,
  Table,
  Tabs,
  type MetricTrend,
  type SummaryMetricProps,
} from '@/design-system'
import { useToastStore } from '@/composables/useToast'
import { useThemeStore } from '@/stores/theme'
import { downloadCsv } from '@/utils/csv'
import { formatCurrency } from '@/utils/format'
import '@/styles/analytics.css'

type Period = 'week' | 'month' | 'quarter' | 'year'

const periods: Period[] = ['week', 'month', 'quarter', 'year']

const metricDefinitions = [
  { icon: 'ri-timer-line', label: '平均收款周期' },
  { icon: 'ri-funds-line', label: '预期收款' },
  { icon: 'ri-percent-line', label: '收款率' },
  { icon: 'ri-error-warning-line', label: '逾期比例' },
] as const

const emptyStats: DashboardStats = {
  avg_collection_days: 0,
  avg_collection_days_trend: 0,
  overdue_amount: 0,
  overdue_trend: 0,
  paid_amount: 0,
  paid_trend: 0,
  pending_amount: 0,
  pending_trend: 0,
  total_amount: 0,
  total_trend: 0,
}

const emptyTrend: IncomeTrend = {
  actual_values: [],
  expected_values: [],
  labels: [],
}

const periodLabel = (period: Period) => {
  if (period === 'week') return '周'
  if (period === 'month') return '月'
  if (period === 'quarter') return '季'
  return '年'
}

const formatWholeCurrency = (amount: number) => `¥${Math.round(amount).toLocaleString('zh-CN')}`

const formatAxisCurrency = (amount: number) => {
  if (Math.abs(amount) >= 100000000) return `¥${(amount / 100000000).toFixed(1)}亿`
  if (Math.abs(amount) >= 10000) return `¥${(amount / 10000).toFixed(1)}万`
  return `¥${Math.round(amount).toLocaleString('zh-CN')}`
}

const readToken = (name: string, fallback: string) => {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const makeTrend = (
  value: number,
  prefix: string,
  label: string,
  lowerIsBetter = false,
): MetricTrend => {
  const direction: MetricTrend['direction'] = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const favorable = lowerIsBetter ? value <= 0 : value >= 0
  const tone: MetricTrend['tone'] =
    direction === 'flat' ? 'neutral' : favorable ? 'positive' : 'negative'
  const directionLabel = direction === 'up' ? '上升' : direction === 'down' ? '下降' : '持平'

  return {
    accessibleLabel: `${prefix}${label}${directionLabel}${Math.abs(value).toFixed(2)}%`,
    direction,
    label: `${Math.abs(value).toFixed(2)}%`,
    tone,
  }
}

export default function AnalyticsView() {
  const toastError = useToastStore((state) => state.error)
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)
  const reducedMotion = useReducedMotion()
  const [activePeriod, setActivePeriod] = useState<Period>('month')
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [trend, setTrend] = useState<IncomeTrend>(emptyTrend)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const barChartCanvas = useRef<HTMLCanvasElement | null>(null)
  const breakdownChartCanvas = useRef<HTMLCanvasElement | null>(null)
  const barChart = useRef<Chart<'bar'> | null>(null)
  const breakdownChart = useRef<Chart<'bar'> | null>(null)
  const isMountedRef = useRef(false)
  const requestGenerationRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      requestGenerationRef.current += 1
    }
  }, [])

  const collectionRate = useMemo(() => {
    if (!stats.total_amount) return '0.00'
    return ((stats.paid_amount / stats.total_amount) * 100).toFixed(2)
  }, [stats])

  const overdueRate = useMemo(() => {
    if (!stats.total_amount) return '0.00'
    return ((stats.overdue_amount / stats.total_amount) * 100).toFixed(2)
  }, [stats])

  const pendingNotOverdue = useMemo(
    () => Math.max(0, stats.pending_amount - stats.overdue_amount),
    [stats.overdue_amount, stats.pending_amount],
  )

  const hasTrendData = useMemo(
    () =>
      trend.actual_values.some((value) => value !== 0) ||
      trend.expected_values.some((value) => value !== 0),
    [trend.actual_values, trend.expected_values],
  )

  const hasBreakdownData = stats.paid_amount + pendingNotOverdue + stats.overdue_amount > 0

  const trendPrefix = useMemo(() => `较上${periodLabel(activePeriod)}`, [activePeriod])

  const chartTitle = useMemo(() => {
    if (activePeriod === 'week') return '周度收入对比'
    if (activePeriod === 'month') return '月度收入对比'
    if (activePeriod === 'quarter') return '季度收入对比'
    return '年度收入对比'
  }, [activePeriod])

  const colors = useMemo(() => {
    const isDark = effectiveTheme === 'dark'
    return {
      actual: readToken('--ods-data-series-actual', isDark ? '#ff9d45' : '#df5d16'),
      actualFill: readToken(
        '--ods-data-series-actual-fill',
        isDark ? 'rgba(255, 138, 31, 0.16)' : 'rgba(226, 91, 20, 0.14)',
      ),
      danger: readToken('--ods-color-status-danger', isDark ? '#ff6259' : '#d7473e'),
      grid: readToken(
        '--ods-data-grid',
        isDark ? 'rgba(255, 245, 236, 0.07)' : 'rgba(83, 52, 32, 0.08)',
      ),
      planned: readToken('--ods-data-series-planned', isDark ? '#a89c91' : '#85796f'),
      success: readToken('--ods-color-status-success', isDark ? '#43d17a' : '#238653'),
      text: readToken(
        '--ods-color-fg-muted',
        isDark ? 'rgba(255, 247, 237, 0.72)' : 'rgba(51, 39, 31, 0.7)',
      ),
      tooltipBackground: readToken('--ods-data-tooltip-bg', isDark ? '#211d1a' : '#fffaf5'),
      tooltipBorder: readToken('--ods-data-tooltip-border', isDark ? '#4d4037' : '#e4d7cc'),
      tooltipText: readToken('--ods-data-tooltip-fg', isDark ? '#f7f2ee' : '#2c211a'),
      warning: readToken('--ods-color-status-warning', isDark ? '#ffd166' : '#c47b00'),
    }
  }, [effectiveTheme])

  const initCharts = useCallback(() => {
    barChart.current?.destroy()
    breakdownChart.current?.destroy()

    const animation = {
      duration: reducedMotion ? 0 : 280,
      easing: 'easeOutCubic' as const,
    }

    const barContext = barChartCanvas.current?.getContext('2d')
    if (barContext) {
      const barConfig: ChartConfiguration<'bar'> = {
        data: {
          datasets: [
            {
              backgroundColor: colors.actual,
              borderColor: colors.actual,
              borderRadius: 8,
              borderSkipped: false,
              data: [],
              label: '实际收款',
            },
            {
              backgroundColor: colors.actualFill,
              borderColor: colors.planned,
              borderRadius: 8,
              borderSkipped: false,
              data: [],
              label: '预期收款',
            },
          ],
          labels: [],
        },
        options: {
          animation,
          interaction: { intersect: false, mode: 'index' },
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: colors.text,
                padding: 16,
                pointStyle: 'circle',
                usePointStyle: true,
              },
              position: 'bottom',
            },
            tooltip: {
              backgroundColor: colors.tooltipBackground,
              bodyColor: colors.tooltipText,
              borderColor: colors.tooltipBorder,
              borderWidth: 1,
              callbacks: {
                label: (context) =>
                  `${context.dataset.label ?? '金额'}：${formatCurrency(Number(context.raw))}`,
              },
              titleColor: colors.tooltipText,
            },
          },
          responsive: true,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: colors.text, maxRotation: 0 },
            },
            y: {
              beginAtZero: true,
              grid: { color: colors.grid },
              ticks: {
                color: colors.text,
                callback: (value) => formatAxisCurrency(Number(value) || 0),
              },
            },
          },
        },
        type: 'bar',
      }
      barChart.current = new Chart(barContext, barConfig)
    }

    const breakdownContext = breakdownChartCanvas.current?.getContext('2d')
    if (breakdownContext) {
      const breakdownConfig: ChartConfiguration<'bar'> = {
        data: {
          datasets: [
            {
              backgroundColor: [colors.success, colors.warning, colors.danger],
              borderRadius: 8,
              borderSkipped: false,
              data: [0, 0, 0],
              label: '金额',
            },
          ],
          labels: ['已收款', '待收未逾期', '逾期'],
        },
        options: {
          animation,
          indexAxis: 'y',
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: colors.tooltipBackground,
              bodyColor: colors.tooltipText,
              borderColor: colors.tooltipBorder,
              borderWidth: 1,
              callbacks: {
                label: (context) =>
                  `${context.label ?? '金额'}：${formatCurrency(Number(context.raw))}`,
              },
              titleColor: colors.tooltipText,
            },
          },
          responsive: true,
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: colors.grid },
              ticks: {
                color: colors.text,
                callback: (value) => formatAxisCurrency(Number(value) || 0),
              },
            },
            y: {
              grid: { display: false },
              ticks: { color: colors.text },
            },
          },
        },
        type: 'bar',
      }
      breakdownChart.current = new Chart(breakdownContext, breakdownConfig)
    }
  }, [colors, reducedMotion])

  const fetchAnalytics = useCallback(
    async (period: Period, signal?: AbortSignal) => {
      const requestGeneration = ++requestGenerationRef.current
      setIsLoading(true)
      setLoadError(false)

      try {
        const [statsResponse, trendResponse] = await Promise.all([
          dashboardApi.getStats(period, signal),
          dashboardApi.getIncomeTrend(period, signal),
        ])
        if (
          signal?.aborted ||
          !isMountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          return
        }
        setStats(statsResponse.data.data)
        setTrend(trendResponse.data.data)
      } catch {
        if (
          signal?.aborted ||
          !isMountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          return
        }
        setLoadError(true)
        toastError('获取分析数据失败')
      } finally {
        if (
          !signal?.aborted &&
          isMountedRef.current &&
          requestGeneration === requestGenerationRef.current
        ) {
          setIsLoading(false)
        }
      }
    },
    [toastError],
  )

  useEffect(() => {
    if (isLoading || loadError) {
      barChart.current?.destroy()
      breakdownChart.current?.destroy()
      barChart.current = null
      breakdownChart.current = null
      return
    }

    initCharts()
    return () => {
      barChart.current?.destroy()
      breakdownChart.current?.destroy()
      barChart.current = null
      breakdownChart.current = null
    }
  }, [initCharts, isLoading, loadError])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void fetchAnalytics(activePeriod, controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
      requestGenerationRef.current += 1
    }
  }, [activePeriod, fetchAnalytics])

  useEffect(() => {
    const chart = barChart.current
    if (!chart) return
    chart.data.labels = trend.labels
    if (chart.data.datasets[0]) chart.data.datasets[0].data = trend.actual_values
    if (chart.data.datasets[1]) chart.data.datasets[1].data = trend.expected_values
    if (reducedMotion) chart.update('none')
    else chart.update()
  }, [colors, reducedMotion, trend])

  useEffect(() => {
    if (!breakdownChart.current) return
    if (breakdownChart.current.data.datasets[0]) {
      breakdownChart.current.data.datasets[0].data = [
        stats.paid_amount,
        pendingNotOverdue,
        stats.overdue_amount,
      ]
    }
    if (reducedMotion) breakdownChart.current.update('none')
    else breakdownChart.current.update()
  }, [colors, pendingNotOverdue, reducedMotion, stats.overdue_amount, stats.paid_amount])

  const summaryMetrics = useMemo<SummaryMetricProps[]>(() => {
    if (isLoading || loadError) {
      const status = isLoading ? 'loading' : 'error'
      return metricDefinitions.map((metric) => ({ ...metric, status }))
    }

    return [
      {
        icon: 'ri-timer-line',
        label: '平均收款周期',
        status: 'data' as const,
        trend: makeTrend(stats.avg_collection_days_trend, trendPrefix, '平均周期', true),
        value: `${Math.round(stats.avg_collection_days)} 天`,
      },
      {
        icon: 'ri-funds-line',
        label: '预期收款',
        status: 'data' as const,
        trend: makeTrend(stats.total_trend, trendPrefix, '预期收款'),
        value: formatWholeCurrency(stats.total_amount),
      },
      {
        icon: 'ri-percent-line',
        label: '收款率',
        status: 'data' as const,
        value: `${collectionRate}%`,
      },
      {
        icon: 'ri-error-warning-line',
        label: '逾期比例',
        status: 'data' as const,
        value: `${overdueRate}%`,
      },
    ]
  }, [collectionRate, isLoading, loadError, overdueRate, stats, trendPrefix])

  const handlePeriodChange = (value: string) => {
    const period = periods.find((candidate) => candidate === value)
    if (!period || period === activePeriod) return
    setIsLoading(true)
    setLoadError(false)
    setActivePeriod(period)
  }

  const description = loadError
    ? `${periodLabel(activePeriod)}度回款概览 · 数据暂不可用`
    : isLoading
      ? `${periodLabel(activePeriod)}度回款概览 · 正在加载`
      : `${periodLabel(activePeriod)}度回款概览 · 已收 ${formatWholeCurrency(stats.paid_amount)} / 应收 ${formatWholeCurrency(stats.total_amount)}`

  const retryAction = (
    <Button onClick={() => void fetchAnalytics(activePeriod)} size="sm" variant="secondary">
      重新加载
    </Button>
  )

  const handleExport = useCallback(() => {
    const rows: Array<Array<number | string>> = [
      ['Orange 数据分析'],
      ['统计周期', `${periodLabel(activePeriod)}度`],
      ['平均收款周期（天）', stats.avg_collection_days],
      ['应收金额', stats.total_amount],
      ['已收金额', stats.paid_amount],
      ['待收未逾期金额', pendingNotOverdue],
      ['逾期金额', stats.overdue_amount],
      ['收款率', `${collectionRate}%`],
      ['逾期比例', `${overdueRate}%`],
      [],
      ['趋势周期', '实际收款', '预期收款'],
      ...trend.labels.map((label, index) => [
        label,
        trend.actual_values[index] ?? '',
        trend.expected_values[index] ?? '',
      ]),
    ]
    downloadCsv(`Orange-${activePeriod}-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }, [activePeriod, collectionRate, overdueRate, pendingNotOverdue, stats, trend])

  return (
    <Tabs.Root
      className="analytics-view"
      data-motion-scope="analytics"
      onValueChange={handlePeriodChange}
      value={activePeriod}
    >
      <PageHeader
        actions={
          <div className="analytics-page-toolbar">
            <Tabs.List aria-label="统计周期" variant="accent">
              {periods.map((period) => (
                <Tabs.Tab key={period} value={period}>
                  {periodLabel(period)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <Button
              aria-label="导出报表"
              className="analytics-export-button"
              disabled={isLoading || loadError}
              onClick={handleExport}
              variant="primary"
            >
              <i aria-hidden="true" className="ri-download-line" />
              <span>导出报表</span>
            </Button>
          </div>
        }
        data-motion="entrance"
        description={description}
        eyebrow="INSIGHTS / 回款表现"
        title="数据分析"
      />

      {periods.map((period) => (
        <Tabs.Panel className="analytics-period-panel" key={period} value={period}>
          {activePeriod === period ? (
            <>
              <div
                aria-label="关键指标"
                className="analytics-metrics"
                data-motion-group="metrics"
                role="list"
              >
                {summaryMetrics.map((metric) => (
                  <div className="analytics-metric-item" key={String(metric.label)} role="listitem">
                    <SummaryMetric {...metric} />
                  </div>
                ))}
              </div>

              <div className="analytics-chart-layout" data-motion-group="charts">
                <Card.Root
                  aria-label={chartTitle}
                  as="section"
                  className="analytics-chart-card"
                  data-motion="entrance"
                  variant="tertiary"
                >
                  <Card.Header>
                    <SectionHeader
                      description="实际与预期回款趋势"
                      headingLevel={2}
                      icon={<i className="ri-bar-chart-2-line" />}
                      title={chartTitle}
                    />
                  </Card.Header>
                  <Card.Content className="analytics-chart-card__content">
                    {isLoading ? (
                      <div
                        aria-label={`${chartTitle}加载中`}
                        className="analytics-chart-state"
                        role="status"
                      >
                        <Skeleton height="100%" width="100%" />
                      </div>
                    ) : loadError ? (
                      <EmptyState
                        action={retryAction}
                        className="analytics-chart-empty"
                        description="请检查连接后重新加载"
                        icon={<i className="ri-line-chart-line" />}
                        size="sm"
                        title="趋势数据暂不可用"
                      />
                    ) : !hasTrendData ? (
                      <EmptyState
                        className="analytics-chart-empty"
                        icon={<i className="ri-line-chart-line" />}
                        size="sm"
                        title="本期暂无回款趋势"
                      />
                    ) : (
                      <>
                        <canvas aria-hidden="true" ref={barChartCanvas} />
                        <Table.Root visuallyHidden>
                          <caption>{chartTitle}数据</caption>
                          <Table.Header>
                            <Table.Row>
                              <Table.Column>周期</Table.Column>
                              <Table.Column>实际收款</Table.Column>
                              <Table.Column>预期收款</Table.Column>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {trend.labels.map((label, index) => (
                              <Table.Row key={`${label}-${index}`}>
                                <Table.Column scope="row">{label}</Table.Column>
                                <Table.Cell>
                                  {trend.actual_values[index] == null
                                    ? '暂无数据'
                                    : formatCurrency(trend.actual_values[index] ?? 0)}
                                </Table.Cell>
                                <Table.Cell>
                                  {trend.expected_values[index] == null
                                    ? '暂无数据'
                                    : formatCurrency(trend.expected_values[index] ?? 0)}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </>
                    )}
                  </Card.Content>
                </Card.Root>

                <Card.Root
                  aria-label="资金状态对比"
                  as="section"
                  className="analytics-chart-card"
                  data-motion="entrance"
                  variant="tertiary"
                >
                  <Card.Header>
                    <SectionHeader
                      description="本期到账、本期待收与逾期金额"
                      headingLevel={2}
                      icon={<i className="ri-pie-chart-2-line" />}
                      title="资金状态对比"
                    />
                  </Card.Header>
                  <Card.Content className="analytics-chart-card__content">
                    {isLoading ? (
                      <div
                        aria-label="资金状态对比加载中"
                        className="analytics-chart-state"
                        role="status"
                      >
                        <Skeleton height="100%" width="100%" />
                      </div>
                    ) : loadError ? (
                      <EmptyState
                        action={retryAction}
                        className="analytics-chart-empty"
                        description="请检查连接后重新加载"
                        icon={<i className="ri-bar-chart-horizontal-line" />}
                        size="sm"
                        title="资金状态数据暂不可用"
                      />
                    ) : !hasBreakdownData ? (
                      <EmptyState
                        className="analytics-chart-empty"
                        icon={<i className="ri-bar-chart-horizontal-line" />}
                        size="sm"
                        title="本期暂无资金状态数据"
                      />
                    ) : (
                      <>
                        <canvas aria-hidden="true" ref={breakdownChartCanvas} />
                        <Table.Root visuallyHidden>
                          <caption>资金状态对比数据</caption>
                          <Table.Header>
                            <Table.Row>
                              <Table.Column>状态</Table.Column>
                              <Table.Column>金额</Table.Column>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            <Table.Row>
                              <Table.Column scope="row">已收款</Table.Column>
                              <Table.Cell>{formatCurrency(stats.paid_amount)}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                              <Table.Column scope="row">待收未逾期</Table.Column>
                              <Table.Cell>{formatCurrency(pendingNotOverdue)}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                              <Table.Column scope="row">逾期</Table.Column>
                              <Table.Cell>{formatCurrency(stats.overdue_amount)}</Table.Cell>
                            </Table.Row>
                          </Table.Body>
                        </Table.Root>
                      </>
                    )}
                  </Card.Content>
                </Card.Root>
              </div>
            </>
          ) : null}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  )
}
