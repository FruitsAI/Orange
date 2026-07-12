import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import ConfirmModal from './ConfirmModal'

function ConfirmModalHarness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        删除项目
      </button>
      <ConfirmModal
        message="删除后无法恢复"
        onCancel={() => setOpen(false)}
        onConfirm={onConfirm}
        open={open}
        title="确认删除"
      />
    </>
  )
}

describe('ConfirmModal', () => {
  it('labels the dialog and moves focus to the cancel action', async () => {
    const user = userEvent.setup()
    render(<ConfirmModalHarness />)

    await user.click(screen.getByRole('button', { name: '删除项目' }))

    const dialog = screen.getByRole('dialog', { name: '确认删除' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(screen.getByRole('button', { name: '取消' })).toHaveFocus())
  })

  it('traps forward and backward Tab navigation inside the dialog', async () => {
    const user = userEvent.setup()
    render(<ConfirmModalHarness />)
    await user.click(screen.getByRole('button', { name: '删除项目' }))

    const cancel = screen.getByRole('button', { name: '取消' })
    const confirm = screen.getByRole('button', { name: '确认' })
    await waitFor(() => expect(cancel).toHaveFocus())
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
  })

  it('closes on Escape and restores focus to the opening control', async () => {
    const user = userEvent.setup()
    render(<ConfirmModalHarness />)
    const trigger = screen.getByRole('button', { name: '删除项目' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes only when the overlay itself is clicked', async () => {
    const user = userEvent.setup()
    render(<ConfirmModalHarness />)
    const trigger = screen.getByRole('button', { name: '删除项目' })
    await user.click(trigger)

    await user.click(screen.getByText('删除后无法恢复'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('presentation'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('does not reset focus when an open parent rerenders with new callbacks', async () => {
    const { rerender } = render(
      <ConfirmModal
        message="删除后无法恢复"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        open
        title="确认删除"
      />,
    )
    const confirm = screen.getByRole('button', { name: '确认' })
    confirm.focus()

    rerender(
      <ConfirmModal
        message="删除后无法恢复"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        open
        title="确认删除"
      />,
    )

    expect(confirm).toHaveFocus()
  })
})
