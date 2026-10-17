import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Link } from './Link'

describe('Link', () => {
  it('adds safe external-link defaults while preserving semantic variants and icon content', () => {
    render(
      <Link
        external
        href="https://example.com"
        icon={<span data-testid="external-icon">↗</span>}
        tone="foreground"
        underline="always"
      >
        查看文档
      </Link>,
    )

    const link = screen.getByRole('link', { name: '查看文档' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('data-tone', 'foreground')
    expect(link).toHaveAttribute('data-underline', 'always')
    expect(screen.getByTestId('external-icon').parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})
