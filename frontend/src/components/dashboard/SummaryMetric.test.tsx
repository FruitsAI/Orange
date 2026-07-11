import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SummaryMetric from './SummaryMetric'
import { render } from '@/test/render'

describe('SummaryMetric', () => {
  it('renders its icon, label, and value without inventing a trend', () => {
    const { container } = render(
      <SummaryMetric icon="ri-checkbox-circle-line" label="已结算" value="¥8,000.00" />,
    )

    expect(screen.getByText('已结算')).toBeInTheDocument()
    expect(screen.getByText('¥8,000.00')).toBeInTheDocument()
    expect(container.querySelector('.ri-checkbox-circle-line')).toBeInTheDocument()
    expect(screen.queryByText(/较上期/)).not.toBeInTheDocument()
  })

  it('shows a real trend only when one is supplied', () => {
    render(
      <SummaryMetric
        icon="ri-time-line"
        label="待结算"
        trend={{ direction: 'down', label: '较上期 4.00%' }}
        value="¥1,000.00"
      />,
    )

    expect(screen.getByText('较上期 4.00%')).toBeInTheDocument()
  })
})
