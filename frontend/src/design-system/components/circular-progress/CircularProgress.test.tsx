import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CircularProgress } from './CircularProgress'

describe('CircularProgress', () => {
  it('exposes progressbar semantics and a value label', () => {
    render(<CircularProgress aria-label="回款进度" showValueLabel value={62} />)

    const bar = screen.getByRole('progressbar', { name: '回款进度' })
    expect(bar).toHaveAttribute('aria-valuenow', '62')
    expect(screen.getByText('62%')).toBeInTheDocument()
  })
})
