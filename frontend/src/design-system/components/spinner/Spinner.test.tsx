import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('announces a useful label while hiding its decorative indicator', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Spinner label="正在同步数据" ref={ref} size="lg" tone="accent" />)

    const spinner = screen.getByRole('status', { name: '正在同步数据' })
    expect(spinner).toHaveAttribute('data-size', 'lg')
    expect(spinner).toHaveAttribute('data-tone', 'accent')
    expect(spinner.querySelector('[data-slot="indicator"]')).toHaveAttribute('aria-hidden', 'true')
    expect(ref.current).toBe(spinner)
  })
})
