import { useEffect, useMemo, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { ChartConfiguration, TooltipItem } from 'chart.js'
import GlassCard from '@/components/common/GlassCard'
import { useThemeStore } from '@/stores/theme'

type Period = 'week' | 'month' | 'quarter' | 'year'

interface IncomeChartProps {
  labels: string[]
  values: number[]
  period: Period
  onPeriodChange: (period: Period) => void
}

export default function IncomeChart({ labels, values, period, onPeriodChange }: IncomeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart<'line'> | null>(null)
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)

  const subtitle = useMemo(() => {
    if (period === 'week') return '近7天收款数据'
    if (period === 'month') return '近30天收款数据'
    if (period === 'year') return '近12个月收款数据'
    return '本季度收款数据'
  }, [period])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    chartRef.current?.destroy()

    const isDark = effectiveTheme === 'dark'
    const gradient = ctx.createLinearGradient(0, 0, 0, 280)
    gradient.addColorStop(0, 'rgba(255, 159, 10, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 159, 10, 0)')

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '收款金额',
            data: values,
            borderColor: '#FF9F0A',
            backgroundColor: gradient,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#FF9F0A',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(44, 44, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            bodyColor: isDark ? '#f5f5f7' : '#1d1d1f',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            padding: 12,
            titleColor: isDark ? '#f5f5f7' : '#1d1d1f',
            callbacks: {
              label: (context: TooltipItem<'line'>) => `¥${Number(context.raw).toLocaleString()}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
            ticks: {
              color: isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)',
              callback: (value) => `¥${Number(value) / 1000}k`,
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)' },
          },
        },
      },
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [effectiveTheme, labels, values])

  return (
    <GlassCard>
      <div className="glass-card-header">
        <div>
          <h3 className="glass-card-title">收入趋势</h3>
          <p className="glass-card-subtitle">{subtitle}</p>
        </div>
        <div className="flex gap-sm">
          {(['week', 'month', 'year'] as Period[]).map((item) => (
            <button
              className={`btn btn-sm ${period === item ? 'btn-secondary active' : 'btn-ghost'}`}
              key={item}
              onClick={() => onPeriodChange(item)}
              type="button"
            >
              {item === 'week' ? '周' : item === 'month' ? '月' : '年'}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container">
        <canvas ref={canvasRef} />
      </div>
    </GlassCard>
  )
}
