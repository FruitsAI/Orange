import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('renders into a portal with dialog semantics and closes from its close button', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <Drawer.Root onClose={onClose} open>
        <Drawer.Header>项目筛选</Drawer.Header>
        <Drawer.Body>筛选条件</Drawer.Body>
        <Drawer.Close />
      </Drawer.Root>,
    )

    const dialog = screen.getByRole('dialog', { name: '项目筛选' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.parentElement).toBe(document.body.lastElementChild)
    expect(container).not.toContainElement(dialog)

    await userEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('composes the close button click handler and lets it cancel closing', async () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    render(
      <Drawer.Root onClose={onClose} open>
        <Drawer.Header>项目筛选</Drawer.Header>
        <Drawer.Close
          onClick={(event) => {
            onClick()
            event.preventDefault()
          }}
        />
      </Drawer.Root>,
    )

    await userEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('dismisses only when the pointer press starts and ends on the scrim', () => {
    const onClose = vi.fn()
    render(
      <Drawer.Root onClose={onClose} open>
        <Drawer.Header>项目筛选</Drawer.Header>
        <Drawer.Body>可选择的筛选条件</Drawer.Body>
      </Drawer.Root>,
    )

    const dialog = screen.getByRole('dialog', { name: '项目筛选' })
    const scrim = dialog.parentElement!

    fireEvent.pointerDown(dialog)
    fireEvent.pointerUp(scrim)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.pointerDown(scrim)
    fireEvent.pointerUp(scrim)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps a non-dismissable drawer open on Escape and scrim presses', async () => {
    const onClose = vi.fn()
    render(
      <Drawer.Root dismissable={false} onClose={onClose} open>
        <Drawer.Header>同步处理中</Drawer.Header>
        <Drawer.Body>请等待同步完成</Drawer.Body>
      </Drawer.Root>,
    )

    const scrim = screen.getByRole('dialog', { name: '同步处理中' }).parentElement!
    fireEvent.pointerDown(scrim)
    fireEvent.pointerUp(scrim)
    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('allows only the top overlay layer to handle Escape', async () => {
    const closeLowerDrawer = vi.fn()
    const closeTopDrawer = vi.fn()
    render(
      <>
        <Drawer.Root onClose={closeLowerDrawer} open>
          <Drawer.Header>底层抽屉</Drawer.Header>
        </Drawer.Root>
        <Drawer.Root onClose={closeTopDrawer} open>
          <Drawer.Header>顶层抽屉</Drawer.Header>
        </Drawer.Root>
      </>,
    )

    await userEvent.keyboard('{Escape}')

    expect(closeTopDrawer).toHaveBeenCalledTimes(1)
    expect(closeLowerDrawer).not.toHaveBeenCalled()
  })
})
