import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import { Chip } from '../../components/chip'
import { SummaryMetric } from './SummaryMetric'

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
    expect(screen.getByRole('article')).toHaveClass('ods-summary-metric')
    expect(container.querySelector('.ri-checkbox-circle-line')?.parentElement).toHaveClass(
      'ods-surface',
    )
    expect(container.querySelector('.ods-summary-metric__icon')).toHaveAttribute(
      'data-tone',
      'accent',
    )
    expect(screen.queryByText(/较上期/)).not.toBeInTheDocument()
  })

  it('shows supplied trend and stacked metadata through the public pattern API', () => {
    const { rerender } = render(
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

    expect(screen.getByLabelText('较上期下降 4.00%，表现改善')).toHaveAttribute(
      'data-tone',
      'success',
    )

    rerender(
      <SummaryMetric
        label="7 月应收"
        layout="stacked"
        meta={<Chip size="sm">2 笔计划</Chip>}
        status="data"
        tone="accent"
        value="¥8,000.00"
      />,
    )
    expect(screen.getByRole('article')).toHaveAttribute('data-layout', 'stacked')
    expect(screen.getByText('2 笔计划')).toHaveClass('ods-chip')
  })

  it('distinguishes loading and error from a real zero value', () => {
    const { rerender } = render(
      <SummaryMetric icon="ri-time-line" label="待结算" status="loading" />,
    )

    expect(screen.getByText('待结算加载中')).toBeInTheDocument()

    rerender(<SummaryMetric icon="ri-time-line" label="待结算" status="error" />)
    expect(screen.getByText('暂不可用')).toBeInTheDocument()

    rerender(<SummaryMetric icon="ri-time-line" label="待结算" status="data" value="0" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
