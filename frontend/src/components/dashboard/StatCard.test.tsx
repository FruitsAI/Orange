import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('composes ODS surfaces and chips for reusable visual primitives', () => {
    const { container } = render(
      <StatCard
        icon="ri-funds-line"
        label="预期收款"
        trend="12.5%"
        trendUp
        value="¥12,000"
        variant="success"
      />,
    )

    expect(container.querySelector('.stat-card')).toHaveClass('ods-card')
    expect(container.querySelector('.stat-card-icon')).toHaveClass('ods-surface')
    expect(container.querySelector('.stat-card-icon')).toHaveAttribute('data-tone', 'success')
    expect(screen.getByText(/12\.5%/).closest('.ods-chip')).toHaveAttribute('data-tone', 'success')
  })
})
