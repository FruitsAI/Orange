import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders the count mark anchored to its child', () => {
    render(
      <Badge content={5} tone="danger">
        <button type="button">通知</button>
      </Badge>,
    )

    expect(screen.getByRole('button', { name: '通知' })).toBeInTheDocument()
    const mark = screen.getByText('5')
    expect(mark).toHaveAttribute('data-tone', 'danger')
    expect(mark).toHaveAttribute('data-placement', 'top-right')
  })
})
