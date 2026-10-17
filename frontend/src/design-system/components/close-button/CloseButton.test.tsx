import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CloseButton } from './CloseButton'

describe('CloseButton', () => {
  it('reuses IconButton semantics and exposes a localized default label', async () => {
    const onClick = vi.fn()
    render(<CloseButton onClick={onClick} />)

    const button = screen.getByRole('button', { name: '关闭' })
    expect(button).toHaveClass('ods-button', 'ods-icon-button', 'ods-close-button')
    expect(button).toHaveAttribute('data-variant', 'ghost')

    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
