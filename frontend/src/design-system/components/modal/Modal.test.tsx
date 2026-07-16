import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders into a portal with dialog semantics and closes on the close button', async () => {
    const onClose = vi.fn()
    render(
      <Modal.Root onClose={onClose} open>
        <Modal.Header>标题</Modal.Header>
        <Modal.Body>正文内容</Modal.Body>
        <Modal.Footer>
          <Modal.Close />
        </Modal.Footer>
      </Modal.Root>,
    )

    const dialog = screen.getByRole('dialog', { name: '标题' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    await userEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal.Root onClose={onClose} open>
        <Modal.Header>标题</Modal.Header>
        <Modal.Body>正文</Modal.Body>
      </Modal.Root>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
