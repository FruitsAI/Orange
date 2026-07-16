import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from '../drawer'
import { Modal } from '../modal'
import { Popover, usePopoverClose } from './Popover'

function ClosePopoverButton() {
  const close = usePopoverClose()
  return (
    <button onClick={close} type="button">
      完成
    </button>
  )
}

describe('Popover', () => {
  it('connects trigger and content semantics, then closes through its context action', async () => {
    const onOpenChange = vi.fn()
    const onTriggerClick = vi.fn()

    render(
      <Popover.Root onOpenChange={onOpenChange} placement="bottom-end">
        <Popover.Trigger>
          <button onClick={onTriggerClick} type="button">
            打开筛选
          </button>
        </Popover.Trigger>
        <Popover.Content padding="none">
          <span>筛选内容</span>
          <ClosePopoverButton />
        </Popover.Content>
      </Popover.Root>,
    )

    const trigger = screen.getByRole('button', { name: '打开筛选' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog).toHaveAttribute('data-placement', 'bottom-end')
    expect(dialog).toHaveAttribute('data-padding', 'none')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    expect(onTriggerClick).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)

    await userEvent.click(screen.getByRole('button', { name: '完成' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('closes an open popover on Escape', async () => {
    render(
      <Popover.Root defaultOpen>
        <Popover.Trigger>
          <button type="button">帮助</button>
        </Popover.Trigger>
        <Popover.Content>帮助内容</Popover.Content>
      </Popover.Root>,
    )

    const trigger = screen.getByRole('button', { name: '帮助' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('respects a trigger that prevents its click default', async () => {
    const onOpenChange = vi.fn()
    render(
      <Popover.Root onOpenChange={onOpenChange}>
        <Popover.Trigger>
          <button onClick={(event) => event.preventDefault()} type="button">
            受控触发器
          </button>
        </Popover.Trigger>
        <Popover.Content>不应打开</Popover.Content>
      </Popover.Root>,
    )

    await userEvent.click(screen.getByRole('button', { name: '受控触发器' }))

    expect(screen.queryByText('不应打开')).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('lets an open popover consume Escape before its parent modal', async () => {
    const onModalClose = vi.fn()
    render(
      <Modal.Root onClose={onModalClose} open>
        <Modal.Header>编辑项目</Modal.Header>
        <Modal.Body>
          <Popover.Root>
            <Popover.Trigger>
              <button type="button">选择状态</button>
            </Popover.Trigger>
            <Popover.Content>状态选项</Popover.Content>
          </Popover.Root>
        </Modal.Body>
      </Modal.Root>,
    )

    const trigger = screen.getByRole('button', { name: '选择状态' })
    await userEvent.click(trigger)
    expect(screen.getByText('状态选项')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByText('状态选项')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '编辑项目' })).toBeInTheDocument()
    expect(onModalClose).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(onModalClose).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      label: '弹窗',
      renderOverlay: (children: ReactNode) => (
        <Modal.Root onClose={() => undefined} open>
          <Modal.Header>编辑项目</Modal.Header>
          <Modal.Body>{children}</Modal.Body>
        </Modal.Root>
      ),
    },
    {
      label: '抽屉',
      renderOverlay: (children: ReactNode) => (
        <Drawer.Root onClose={() => undefined} open>
          <Drawer.Header>筛选项目</Drawer.Header>
          <Drawer.Body>{children}</Drawer.Body>
        </Drawer.Root>
      ),
    },
  ])('layers a portaled popover immediately above its parent $label', async ({ renderOverlay }) => {
    render(
      renderOverlay(
        <Popover.Root defaultOpen>
          <Popover.Trigger>
            <button type="button">选择状态</button>
          </Popover.Trigger>
          <Popover.Content>状态选项</Popover.Content>
        </Popover.Root>,
      ),
    )

    const parentDialog = screen.getByRole('dialog', { name: /编辑项目|筛选项目/ })
    const scrim = parentDialog.parentElement
    const childPopover = screen.getByText('状态选项').closest('[data-slot="popover"]')

    await waitFor(() => {
      expect(scrim).toHaveStyle({ zIndex: 'calc(var(--ods-z-modal) + 0)' })
      expect(childPopover).toHaveStyle({ zIndex: 'calc(var(--ods-z-modal) + 1)' })
    })
  })

  it('lets focus move within a child portaled popover without the parent modal reclaiming it', async () => {
    render(
      <Modal.Root onClose={() => undefined} open>
        <Modal.Header>编辑项目</Modal.Header>
        <Modal.Body>
          <button type="button">弹窗内按钮</button>
          <Popover.Root defaultOpen>
            <Popover.Trigger>
              <button type="button">选择状态</button>
            </Popover.Trigger>
            <Popover.Content>
              <button type="button">进行中</button>
              <button type="button">已完成</button>
            </Popover.Content>
          </Popover.Root>
        </Modal.Body>
      </Modal.Root>,
    )

    const firstPortaledButton = screen.getByRole('button', { name: '进行中' })
    firstPortaledButton.focus()
    expect(firstPortaledButton).toHaveFocus()

    await userEvent.tab()

    expect(screen.getByRole('button', { name: '已完成' })).toHaveFocus()
  })

  it('keeps nested portal layers ordered and dismisses only the top child', async () => {
    render(
      <Modal.Root onClose={() => undefined} open>
        <Modal.Header>编辑项目</Modal.Header>
        <Modal.Body>
          <Popover.Root defaultOpen>
            <Popover.Trigger>
              <button type="button">打开外层</button>
            </Popover.Trigger>
            <Popover.Content>
              <span>外层内容</span>
              <Popover.Root defaultOpen>
                <Popover.Trigger>
                  <button type="button">打开内层</button>
                </Popover.Trigger>
                <Popover.Content>
                  <button type="button">内层操作</button>
                </Popover.Content>
              </Popover.Root>
            </Popover.Content>
          </Popover.Root>
        </Modal.Body>
      </Modal.Root>,
    )

    const scrim = screen.getByRole('dialog', { name: '编辑项目' }).parentElement
    const outer = screen.getByText('外层内容').closest('[data-slot="popover"]')
    const inner = screen.getByRole('button', { name: '内层操作' }).closest('[data-slot="popover"]')

    await waitFor(() => {
      expect(scrim).toHaveStyle({ zIndex: 'calc(var(--ods-z-modal) + 0)' })
      expect(outer).toHaveStyle({ zIndex: 'calc(var(--ods-z-modal) + 1)' })
      expect(inner).toHaveStyle({ zIndex: 'calc(var(--ods-z-modal) + 2)' })
    })

    await userEvent.click(screen.getByRole('button', { name: '内层操作' }))
    expect(screen.getByText('外层内容')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '内层操作' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: '内层操作' })).not.toBeInTheDocument()
    expect(screen.getByText('外层内容')).toBeInTheDocument()
  })
})
