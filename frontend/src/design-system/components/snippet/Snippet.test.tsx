import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Snippet } from './Snippet'

const setClipboard = (writeText?: (value: string) => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  })
}

describe('Snippet', () => {
  afterEach(() => setClipboard())

  it('copies its content and flips to the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const onCopySuccess = vi.fn()
    setClipboard(writeText)

    render(<Snippet onCopySuccess={onCopySuccess}>npm run dev</Snippet>)

    await userEvent.click(screen.getByRole('button', { name: '复制' }))

    expect(writeText).toHaveBeenCalledWith('npm run dev')
    expect(onCopySuccess).toHaveBeenCalledWith('npm run dev')
    expect(screen.getByRole('button', { name: '已复制' })).toBeInTheDocument()
  })

  it('reports a copy error when the Clipboard API is unavailable', async () => {
    const onCopyError = vi.fn()
    setClipboard()

    render(<Snippet onCopyError={onCopyError}>private token</Snippet>)
    await userEvent.click(screen.getByRole('button', { name: '复制' }))

    expect(onCopyError).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '复制' })).not.toHaveAttribute('data-copied')
  })

  it('only applies feedback from the latest copy request', async () => {
    let resolveFirst: (() => void) | undefined
    let resolveSecond: (() => void) | undefined
    const first = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const second = new Promise<void>((resolve) => {
      resolveSecond = resolve
    })
    const writeText = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    const onCopySuccess = vi.fn()
    setClipboard(writeText)
    const { rerender } = render(
      <Snippet copyValue="first" onCopySuccess={onCopySuccess}>
        first
      </Snippet>,
    )

    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    rerender(
      <Snippet copyValue="second" onCopySuccess={onCopySuccess}>
        second
      </Snippet>,
    )
    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    await act(async () => {
      resolveFirst?.()
      await first
    })
    expect(onCopySuccess).not.toHaveBeenCalled()
    await act(async () => {
      resolveSecond?.()
      await second
    })
    expect(onCopySuccess).toHaveBeenCalledOnce()
    expect(onCopySuccess).toHaveBeenCalledWith('second')
  })

  it('ignores a pending copy after unmount', async () => {
    let resolveCopy: (() => void) | undefined
    const pendingCopy = new Promise<void>((resolve) => {
      resolveCopy = resolve
    })
    setClipboard(vi.fn(() => pendingCopy))
    const onCopySuccess = vi.fn()
    const { unmount } = render(<Snippet onCopySuccess={onCopySuccess}>secret</Snippet>)

    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    unmount()
    await act(async () => {
      resolveCopy?.()
      await pendingCopy
    })

    expect(onCopySuccess).not.toHaveBeenCalled()
  })
})
