import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
        <Popover.Content>
          <span>筛选内容</span>
          <ClosePopoverButton />
        </Popover.Content>
      </Popover.Root>,
    )

    const trigger = screen.getByRole('button', { name: '打开筛选' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('data-placement', 'bottom-end')
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

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
