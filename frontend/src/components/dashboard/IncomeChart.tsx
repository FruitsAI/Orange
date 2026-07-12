import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import GlassCard from '@/components/common/GlassCard'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useThemeStore } from '@/stores/theme'
import { formatCurrency } from '@/utils/format'
import {
  normalizeSeries,
  type DashboardPeriod,
  type IncomeSeriesValue,
} from '@/views/dashboard/dashboardModel'
import { createIncomeChartConfig, incomePeriodOptions } from './incomeChartConfig'

interface IncomeChartProps {
  labels?: string[]
  expectedValues?: IncomeSeriesValue[]
  actualValues?: IncomeSeriesValue[]
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
  const reducedMotion = useReducedMotion()
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
  const safeLabels = labels ?? []
  const accessibleExpected = normalizeSeries(safeLabels, expectedValues)
  const accessibleActual = normalizeSeries(safeLabels, actualValues)

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
        <canvas aria-hidden="true" ref={canvasRef} />
      </div>
      <table className="income-chart__accessible">
        <caption>{subtitle}数据</caption>
        <thead>
          <tr>
            <th scope="col">周期</th>
            <th scope="col">计划回款</th>
            <th scope="col">实际回款</th>
          </tr>
        </thead>
        <tbody>
          {safeLabels.map((label, index) => (
            <tr key={`${label}-${index}`}>
              <th scope="row">{label}</th>
              <td>
                {accessibleExpected[index] === null
                  ? '暂无数据'
                  : formatCurrency(accessibleExpected[index])}
              </td>
              <td>
                {accessibleActual[index] === null
                  ? '暂无数据'
                  : formatCurrency(accessibleActual[index])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  )
}
