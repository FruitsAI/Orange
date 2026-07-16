import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Toaster } from './Toaster'
import { toast } from './toastStore'

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
})
