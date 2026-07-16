import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import EmberPanel from '@/components/common/EmberPanel'
import { Button, ButtonGroup, SectionHeader, Table } from '@/design-system'
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
    <EmberPanel>
      <SectionHeader
        actions={
          <ButtonGroup aria-label="趋势周期" className="income-chart__periods">
            {incomePeriodOptions.map((option) => (
              <Button
                aria-pressed={period === option.period}
                key={option.period}
                onClick={() => onPeriodChange(option.period)}
                size="sm"
                variant={period === option.period ? 'secondary' : 'ghost'}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        }
        className="income-chart__header"
        density="compact"
        description={subtitle}
        headingLevel={2}
        title="现金流趋势"
      />
      <div className="chart-container income-chart__canvas">
        <canvas aria-hidden="true" ref={canvasRef} />
      </div>
      <Table.Root visuallyHidden>
        <caption>{subtitle}数据</caption>
        <Table.Header>
          <Table.Row>
            <Table.Column>周期</Table.Column>
            <Table.Column>计划回款</Table.Column>
            <Table.Column>实际回款</Table.Column>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {safeLabels.map((label, index) => (
            <Table.Row key={`${label}-${index}`}>
              <Table.Column scope="row">{label}</Table.Column>
              <Table.Cell>
                {accessibleExpected[index] === null
                  ? '暂无数据'
                  : formatCurrency(accessibleExpected[index])}
              </Table.Cell>
              <Table.Cell>
                {accessibleActual[index] === null
                  ? '暂无数据'
                  : formatCurrency(accessibleActual[index])}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </EmberPanel>
  )
}
