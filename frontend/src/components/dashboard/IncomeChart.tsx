import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import GlassCard from '@/components/common/GlassCard'
import { useThemeStore } from '@/stores/theme'
import type { DashboardPeriod } from '@/views/dashboard/dashboardModel'
import { createIncomeChartConfig, incomePeriodOptions } from './incomeChartConfig'

interface IncomeChartProps {
  labels?: string[]
  expectedValues?: number[]
  actualValues?: number[]
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
}

export default function IncomeChart({
  actualValues,
  expectedValues,
  labels,
  period,
  onPeriodChange,
}: IncomeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart<'line'> | null>(null)
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [initialConfig] = useState(() =>
    createIncomeChartConfig({
      actualValues,
      expectedValues,
      labels,
      reducedMotion,
      theme: effectiveTheme,
    }),
  )

  const subtitle = useMemo(
    () => incomePeriodOptions.find((option) => option.period === period)?.subtitle ?? '',
    [period],
  )

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    chartRef.current = new Chart(context, initialConfig)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [initialConfig])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const nextConfig = createIncomeChartConfig({
      actualValues,
      expectedValues,
      labels,
      reducedMotion,
      theme: effectiveTheme,
    })
    chart.data = nextConfig.data
    chart.options = nextConfig.options ?? {}
    chart.update()
  }, [actualValues, effectiveTheme, expectedValues, labels, reducedMotion])

  return (
    <GlassCard className="income-chart-card">
      <div className="glass-card-header income-chart__header">
        <div>
          <h3 className="glass-card-title">现金流趋势</h3>
          <p className="glass-card-subtitle">{subtitle}</p>
        </div>
        <div aria-label="趋势周期" className="income-chart__periods" role="group">
          {incomePeriodOptions.map((option) => (
            <button
              aria-pressed={period === option.period}
              className={`btn btn-sm ${period === option.period ? 'btn-secondary active' : 'btn-ghost'}`}
              key={option.period}
              onClick={() => onPeriodChange(option.period)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container income-chart__canvas">
        <canvas aria-label="计划与实际回款趋势图" ref={canvasRef} role="img" />
      </div>
    </GlassCard>
  )
}
