import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Snippet } from './Snippet'

describe('Snippet', () => {
  it('copies its content and flips to the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<Snippet>npm run dev</Snippet>)

    await userEvent.click(screen.getByRole('button', { name: '复制' }))

    expect(writeText).toHaveBeenCalledWith('npm run dev')
    expect(screen.getByRole('button', { name: '已复制' })).toBeInTheDocument()
  })
})
