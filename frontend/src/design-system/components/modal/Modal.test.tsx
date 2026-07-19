import { fireEvent, render, screen } from '@testing-library/react'
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

  it('composes the close button click handler and lets it cancel closing', async () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    render(
      <Modal.Root onClose={onClose} open>
        <Modal.Header>标题</Modal.Header>
        <Modal.Close
          onClick={(event) => {
            onClick()
            event.preventDefault()
          }}
        />
      </Modal.Root>,
    )

    await userEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
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

  it('dismisses only when the pointer press starts and ends on the scrim', () => {
    const onClose = vi.fn()
    render(
      <Modal.Root onClose={onClose} open>
        <Modal.Header>标题</Modal.Header>
        <Modal.Body>可选择的正文</Modal.Body>
      </Modal.Root>,
    )

    const dialog = screen.getByRole('dialog', { name: '标题' })
    const scrim = dialog.parentElement!

    fireEvent.pointerDown(dialog)
    fireEvent.pointerUp(scrim)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.pointerDown(scrim)
    fireEvent.pointerUp(scrim)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps a non-dismissable modal open on Escape and scrim presses', async () => {
    const onClose = vi.fn()
    render(
      <Modal.Root dismissable={false} onClose={onClose} open>
        <Modal.Header>一次性密钥</Modal.Header>
        <Modal.Body>请先复制密钥</Modal.Body>
      </Modal.Root>,
    )

    const scrim = screen.getByRole('dialog', { name: '一次性密钥' }).parentElement!
    fireEvent.pointerDown(scrim)
    fireEvent.pointerUp(scrim)
    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })
})
