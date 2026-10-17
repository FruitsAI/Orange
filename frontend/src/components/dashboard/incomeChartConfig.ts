import type { ChartConfiguration, TooltipItem } from 'chart.js'
import { formatCurrency } from '@/utils/format'
import {
  normalizeSeries,
  type DashboardPeriod,
  type IncomeSeriesValue,
} from '@/views/dashboard/dashboardModel'

export const incomePeriodOptions: Array<{
  label: string
  period: DashboardPeriod
  subtitle: string
}> = [
  { label: '周', period: 'week', subtitle: '近7天计划与实际回款' },
  { label: '月', period: 'month', subtitle: '近30天计划与实际回款' },
  { label: '季', period: 'quarter', subtitle: '近3个月计划与实际回款' },
  { label: '年', period: 'year', subtitle: '近12个月计划与实际回款' },
]

interface IncomeChartConfigInput {
  labels?: string[]
  expectedValues?: IncomeSeriesValue[]
  actualValues?: IncomeSeriesValue[]
  theme: 'light' | 'dark'
  reducedMotion: boolean
}

export function createIncomeChartConfig({
  actualValues,
  expectedValues,
  labels,
  reducedMotion,
  theme,
}: IncomeChartConfigInput): ChartConfiguration<'line'> {
  const isDark = theme === 'dark'
  const safeLabels = labels ?? []
  const textColor = isDark ? 'rgba(245, 239, 234, 0.68)' : 'rgba(64, 52, 44, 0.7)'
  const gridColor = isDark ? 'rgba(255, 245, 236, 0.07)' : 'rgba(83, 52, 32, 0.08)'

  return {
    type: 'line',
    data: {
      labels: safeLabels,
      datasets: [
        {
          backgroundColor: 'transparent',
          borderColor: isDark ? '#a89c91' : '#85796f',
          borderDash: [6, 6],
          borderWidth: 2,
          data: normalizeSeries(safeLabels, expectedValues),
          fill: false,
          label: '计划回款',
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.32,
        },
        {
          backgroundColor: isDark ? 'rgba(255, 138, 31, 0.16)' : 'rgba(226, 91, 20, 0.14)',
          borderColor: isDark ? '#ff9d45' : '#df5d16',
          borderWidth: 2.5,
          data: normalizeSeries(safeLabels, actualValues),
          fill: true,
          label: '实际回款',
          pointBackgroundColor: isDark ? '#211d1a' : '#fffaf5',
          pointBorderColor: isDark ? '#ff9d45' : '#df5d16',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointRadius: 3,
          tension: 0.32,
        },
      ],
    },
    options: {
      animation: { duration: reducedMotion ? 0 : 240 },
      interaction: { intersect: false, mode: 'index' },
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          align: 'end',
          labels: {
            boxHeight: 8,
            boxWidth: 24,
            color: textColor,
            padding: 16,
            usePointStyle: false,
          },
          position: 'top',
        },
        tooltip: {
          backgroundColor: isDark ? '#211d1a' : '#fffaf5',
          bodyColor: isDark ? '#f7f2ee' : '#2c211a',
          borderColor: isDark ? '#4d4037' : '#e4d7cc',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          titleColor: isDark ? '#f7f2ee' : '#2c211a',
          callbacks: {
            label: (context: TooltipItem<'line'>) =>
              `${context.dataset.label ?? '金额'}：${formatCurrency(Number(context.raw))}`,
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: textColor, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (value) =>
              new Intl.NumberFormat('zh-CN', {
                compactDisplay: 'short',
                maximumFractionDigits: 1,
                notation: 'compact',
                style: 'currency',
                currency: 'CNY',
              }).format(Number(value) || 0),
          },
        },
      },
    },
  }
}
