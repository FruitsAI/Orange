import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chip } from './Chip'

describe('Chip', () => {
  it('renders reusable tone, variant, and size states', () => {
    const ref = createRef<HTMLSpanElement>()
    render(
      <Chip ref={ref} size="sm" tone="success" variant="outline">
        已完成
      </Chip>,
    )

    const chip = screen.getByText('已完成')
    expect(chip).toHaveClass('ods-chip')
    expect(chip).toHaveAttribute('data-size', 'sm')
    expect(chip).toHaveAttribute('data-tone', 'success')
    expect(chip).toHaveAttribute('data-variant', 'outline')
    expect(ref.current).toBe(chip)
  })
})
