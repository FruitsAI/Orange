import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import NotificationDetailModal from './NotificationDetailModal'

const notification = {
  id: 7,
  title: '项目已更新',
  content: '项目进度发生变化',
  type: 2,
  sender_id: 1,
  is_global: 1,
  is_read: true,
  create_time: '2026-07-11T10:00:00Z',
}

function NotificationModalHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        查看项目通知
      </button>
      <NotificationDetailModal
        notification={notification}
        onClose={() => setOpen(false)}
        open={open}
      />
    </>
  )
}

describe('NotificationDetailModal', () => {
  it('provides an explicitly labelled modal dialog and focuses its close button', async () => {
    const user = userEvent.setup()
    render(<NotificationModalHarness />)
    await user.click(screen.getByRole('button', { name: '查看项目通知' }))

    const dialog = screen.getByRole('dialog', { name: '通知详情' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).not.toHaveAttribute('title')
    const close = screen.getByRole('button', { name: '关闭通知详情' })
    expect(close.querySelector('i')).toHaveAttribute('aria-hidden', 'true')
    await waitFor(() => expect(close).toHaveFocus())
  })

  it('keeps Tab focus inside when the close button is the only control', async () => {
    const user = userEvent.setup()
    render(<NotificationModalHarness />)
    await user.click(screen.getByRole('button', { name: '查看项目通知' }))
    const close = screen.getByRole('button', { name: '关闭通知详情' })
    await waitFor(() => expect(close).toHaveFocus())

    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()
  })

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup()
    render(<NotificationModalHarness />)
    const trigger = screen.getByRole('button', { name: '查看项目通知' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
