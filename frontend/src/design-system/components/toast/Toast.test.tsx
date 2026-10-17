import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Toaster } from './Toaster'
import { toast } from './toastStore'
import toastCss from './toast.css?raw'

describe('Toast', () => {
  it('shows a toast via the imperative API and dismisses on click', async () => {
    render(<Toaster />)

    act(() => {
      toast.success('保存成功', 0)
    })

    const item = screen.getByRole('button', { name: /保存成功/ })
    expect(item).toHaveAttribute('data-tone', 'success')

    await userEvent.click(item)
    expect(screen.queryByRole('button', { name: /保存成功/ })).not.toBeInTheDocument()
  })

  it('positions feedback below the shell and keeps entrance motion brief', () => {
    expect(toastCss).toMatch(
      /\.ods-toaster\s*\{[\s\S]*inset-block-start:\s*calc\(var\(--ods-shell-topbar-height\)/,
    )
    expect(toastCss).not.toContain('inset-block-start: var(--ods-space-8)')
    expect(toastCss).toMatch(
      /animation:\s*ods-toast-in var\(--ods-duration-fast\) var\(--ods-ease-spring\)/,
    )
    expect(toastCss).not.toMatch(/ods-toast-in var\(--ods-duration-hero\)/)
  })
})
