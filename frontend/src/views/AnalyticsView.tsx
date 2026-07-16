import Chart from 'chart.js/auto'
import type { ChartConfiguration } from 'chart.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import StatCard from '@/components/dashboard/StatCard'
import { useToastStore } from '@/composables/useToast'
import { Button, ButtonGroup, Card } from '@/design-system'
import { useThemeStore } from '@/stores/theme'

type Period = 'week' | 'month' | 'quarter' | 'year'

const periods: Period[] = ['week', 'month', 'quarter', 'year']

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

const periodLabel = (period: Period) => {
  if (period === 'week') return '周'
  if (period === 'month') return '月'
  if (period === 'quarter') return '季'
  return '年'
}

export default function AnalyticsView() {
  const toastError = useToastStore((state) => state.error)
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)
  const [activePeriod, setActivePeriod] = useState<Period>('month')
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const barChartCanvas = useRef<HTMLCanvasElement | null>(null)
  const doughnutChartCanvas = useRef<HTMLCanvasElement | null>(null)
  const barChart = useRef<Chart<'bar'> | null>(null)
  const doughnutChart = useRef<Chart<'doughnut'> | null>(null)
  const isMountedRef = useRef(false)
  const statsRequestGenerationRef = useRef(0)
  const trendRequestGenerationRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      statsRequestGenerationRef.current += 1
      trendRequestGenerationRef.current += 1
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

  const trendPrefix = useMemo(() => {
    if (activePeriod === 'week') return '较上周'
    if (activePeriod === 'month') return '较上月'
    if (activePeriod === 'quarter') return '较上季'
    return '较上年'
  }, [activePeriod])

  const chartTitle = useMemo(() => {
    if (activePeriod === 'week') return '周度收入对比'
    if (activePeriod === 'month') return '月度收入对比'
    if (activePeriod === 'quarter') return '季度收入对比'
    return '年度收入对比'
  }, [activePeriod])

  const colors = useMemo(() => {
    const isDark = effectiveTheme === 'dark'
    return {
      danger: isDark ? '#FF453A' : '#FF3B30',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      primary: '#FF9F0A',
      primaryLight: 'rgba(255, 159, 10, 0.3)',
      success: isDark ? '#30D158' : '#34C759',
      teal: isDark ? '#64D2FF' : '#5AC8FA',
      textColor: isDark ? 'rgba(235, 235, 245, 0.6)' : 'rgba(60, 60, 67, 0.6)',
      warning: isDark ? '#FF9F0A' : '#FF9500',
    }
  }, [effectiveTheme])

  const initCharts = useCallback(() => {
    barChart.current?.destroy()
    doughnutChart.current?.destroy()

    const barContext = barChartCanvas.current?.getContext('2d')
    if (barContext) {
      const barConfig: ChartConfiguration<'bar'> = {
        data: {
          datasets: [
            {
              backgroundColor: colors.primary,
              borderRadius: 8,
              borderSkipped: false,
              data: [],
              label: '实际收款',
            },
            {
              backgroundColor: colors.primaryLight,
              borderRadius: 8,
              borderSkipped: false,
              data: [],
              label: '预期收款',
            },
          ],
          labels: [],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: colors.textColor,
                padding: 16,
                pointStyle: 'circle',
                usePointStyle: true,
              },
              position: 'bottom',
            },
          },
          responsive: true,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: colors.textColor },
            },
            y: {
              beginAtZero: true,
              grid: { color: colors.gridColor },
              ticks: { color: colors.textColor },
            },
          },
        },
        type: 'bar',
      }
      barChart.current = new Chart(barContext, barConfig)
    }

    const doughnutContext = doughnutChartCanvas.current?.getContext('2d')
    if (doughnutContext) {
      const doughnutConfig: ChartConfiguration<'doughnut'> = {
        data: {
          datasets: [
            {
              backgroundColor: [colors.success, colors.teal, colors.danger],
              borderWidth: 0,
              data: [0, 0, 0],
              hoverOffset: 8,
            },
          ],
          labels: ['已收款', '待收款', '逾期'],
        },
        options: {
          cutout: '68%',
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: colors.textColor,
                padding: 16,
                pointStyle: 'circle',
                usePointStyle: true,
              },
              position: 'bottom',
            },
          },
          responsive: true,
        },
        type: 'doughnut',
      }
      doughnutChart.current = new Chart(doughnutContext, doughnutConfig)
    }
  }, [colors])

  const fetchStats = useCallback(
    async (period: Period) => {
      const requestGeneration = ++statsRequestGenerationRef.current
      try {
        const response = await dashboardApi.getStats(period)
        if (!isMountedRef.current || requestGeneration !== statsRequestGenerationRef.current) return
        setStats(response.data.data)
      } catch {
        if (!isMountedRef.current || requestGeneration !== statsRequestGenerationRef.current) return
        toastError('获取分析数据失败')
      }
    },
    [toastError],
  )

  const fetchCharts = useCallback(
    async (period: Period) => {
      const requestGeneration = ++trendRequestGenerationRef.current
      try {
        const response = await dashboardApi.getIncomeTrend(period)
        if (!isMountedRef.current || requestGeneration !== trendRequestGenerationRef.current) return
        const data = response.data.data
        if (barChart.current) {
          barChart.current.data.labels = data.labels
          if (barChart.current.data.datasets[0])
            barChart.current.data.datasets[0].data = data.actual_values
          if (barChart.current.data.datasets[1])
            barChart.current.data.datasets[1].data = data.expected_values
          barChart.current.update()
        }
      } catch {
        if (!isMountedRef.current || requestGeneration !== trendRequestGenerationRef.current) return
        toastError('获取趋势图失败')
      }
    },
    [toastError],
  )

  useEffect(() => {
    initCharts()
    return () => {
      barChart.current?.destroy()
      doughnutChart.current?.destroy()
      barChart.current = null
      doughnutChart.current = null
    }
  }, [initCharts])

  useEffect(() => {
    statsRequestGenerationRef.current += 1
    trendRequestGenerationRef.current += 1
    const timer = window.setTimeout(() => {
      void fetchStats(activePeriod)
      void fetchCharts(activePeriod)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      statsRequestGenerationRef.current += 1
      trendRequestGenerationRef.current += 1
    }
  }, [activePeriod, fetchCharts, fetchStats])

  useEffect(() => {
    if (doughnutChart.current) {
      if (doughnutChart.current.data.datasets[0]) {
        doughnutChart.current.data.datasets[0].data = [
          stats.paid_amount,
          stats.pending_amount,
          stats.overdue_amount,
        ]
      }
      doughnutChart.current.update()
    }
  }, [stats])

  return (
    <div className="analytics-view">
      <div className="analytics-toolbar">
        <ButtonGroup aria-label="统计周期">
          {periods.map((period) => (
            <Button
              aria-pressed={activePeriod === period}
              key={period}
              onClick={() => setActivePeriod(period)}
              size="sm"
              variant={activePeriod === period ? 'secondary' : 'ghost'}
            >
              {periodLabel(period)}
            </Button>
          ))}
        </ButtonGroup>
        <Button variant="secondary">
          <i aria-hidden="true" className="ri-download-line" />
          <span>导出报表</span>
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-lg mb-lg">
        <StatCard
          icon="ri-time-line"
          label="平均收款周期"
          suffix="天"
          trendPrefix={trendPrefix}
          trendUp={stats.avg_collection_days_trend >= 0}
          trendValue={`${Math.abs(stats.avg_collection_days_trend).toFixed(2)}%`}
          value={Math.round(stats.avg_collection_days)}
          variant="primary"
        />
        <StatCard
          icon="ri-funds-line"
          label="预期收款"
          trendPrefix={trendPrefix}
          trendUp={stats.total_trend >= 0}
          trendValue={`${Math.abs(stats.total_trend).toFixed(2)}%`}
          value={`¥${stats.total_amount.toLocaleString()}`}
          variant="success"
        />
        <StatCard
          icon="ri-percent-line"
          label="收款率"
          suffix="%"
          trendPrefix={trendPrefix}
          trendUp={stats.paid_trend >= 0}
          trendValue={`${Math.abs(stats.paid_trend).toFixed(2)}%`}
          value={collectionRate}
          variant="warning"
        />
        <StatCard
          icon="ri-error-warning-line"
          label="逾期比例"
          suffix="%"
          trendDirection="down"
          trendPrefix={trendPrefix}
          trendUp={stats.overdue_trend >= 0}
          trendValue={`${Math.abs(stats.overdue_trend).toFixed(2)}%`}
          value={overdueRate}
          variant="danger"
        />
      </div>

      <div className="grid chart-layout gap-lg">
        <Card.Root variant="tertiary">
          <Card.Header>
            <Card.Title>{chartTitle}</Card.Title>
          </Card.Header>
          <Card.Content className="chart-container">
            <canvas ref={barChartCanvas} />
          </Card.Content>
        </Card.Root>

        <Card.Root variant="tertiary">
          <Card.Header>
            <Card.Title>收款结构</Card.Title>
          </Card.Header>
          <Card.Content className="chart-container">
            <canvas ref={doughnutChartCanvas} />
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  )
}
