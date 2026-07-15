import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SummaryMetric from './SummaryMetric'
import { render } from '@/test/render'

describe('SummaryMetric', () => {
  it('renders its icon, label, and value without inventing a trend', () => {
    const { container } = render(
      <SummaryMetric
        icon="ri-checkbox-circle-line"
        label="已结算"
        status="data"
        value="¥8,000.00"
      />,
    )

    expect(screen.getByText('已结算')).toBeInTheDocument()
    expect(screen.getByText('¥8,000.00')).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveAttribute('data-motion', 'entrance')
    expect(screen.getByRole('article')).toHaveAttribute('data-motion-item')
    expect(container.querySelector('.ri-checkbox-circle-line')).toBeInTheDocument()
    expect(screen.queryByText(/较上期/)).not.toBeInTheDocument()
  })

  it('shows a real trend only when one is supplied', () => {
    render(
      <SummaryMetric
        icon="ri-time-line"
        label="待结算"
        status="data"
        trend={{
          accessibleLabel: '较上期下降 4.00%，表现改善',
          direction: 'down',
          label: '较上期 4.00%',
          tone: 'positive',
        }}
        value="¥1,000.00"
      />,
    )

    expect(screen.getByText('较上期 4.00%')).toBeInTheDocument()
    expect(screen.getByLabelText('较上期下降 4.00%，表现改善')).toBeInTheDocument()
  })

  it('distinguishes loading and error from an empty metric value', () => {
    const { rerender } = render(
      <SummaryMetric icon="ri-time-line" label="待结算" status="loading" />,
    )

    expect(screen.getByText('待结算加载中')).toBeInTheDocument()
    expect(screen.queryByText('--')).not.toBeInTheDocument()

    rerender(<SummaryMetric icon="ri-time-line" label="待结算" status="error" />)
    expect(screen.getByText('暂不可用')).toBeInTheDocument()
  })
})
