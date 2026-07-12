import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/test/render'
import { useDialogFocus } from './useDialogFocus'

function ChildDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialogFocus({ dialogRef, initialFocusRef: closeRef, onClose, open: true })

  return (
    <div aria-label="子弹窗" aria-modal="true" ref={dialogRef} role="dialog" tabIndex={-1}>
      <button onClick={onClose} ref={closeRef} type="button">
        关闭子弹窗
      </button>
    </div>
  )
}

function ParentDialog({ onClose }: { onClose: () => void }) {
  const [childOpen, setChildOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const childTriggerRef = useRef<HTMLButtonElement>(null)
  useDialogFocus({ dialogRef, initialFocusRef: childTriggerRef, onClose, open: true })

  return (
    <div aria-label="父弹窗" aria-modal="true" ref={dialogRef} role="dialog" tabIndex={-1}>
      <button onClick={() => setChildOpen(true)} ref={childTriggerRef} type="button">
        打开子弹窗
      </button>
      <button onClick={onClose} type="button">
        关闭父弹窗
      </button>
      {childOpen ? <ChildDialog onClose={() => setChildOpen(false)} /> : null}
    </div>
  )
}

function NestedDialogHarness() {
  const [parentOpen, setParentOpen] = useState(false)

  return (
    <>
      <button onClick={() => setParentOpen(true)} type="button">
        打开父弹窗
      </button>
      {parentOpen ? <ParentDialog onClose={() => setParentOpen(false)} /> : null}
    </>
  )
}

function PortalDialog({
  label,
  onClose,
  onRemoveBottom,
}: {
  label: string
  onClose: () => void
  onRemoveBottom?: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialogFocus({ dialogRef, initialFocusRef: closeRef, onClose, open: true })

  return createPortal(
    <div aria-label={label} aria-modal="true" ref={dialogRef} role="dialog" tabIndex={-1}>
      <button onClick={onClose} ref={closeRef} type="button">
        关闭{label}
      </button>
      {onRemoveBottom ? (
        <button onClick={onRemoveBottom} type="button">
          卸载底层弹窗
        </button>
      ) : null}
    </div>,
    document.body,
  )
}

function IndependentPortalHarness() {
  const [bottomOpen, setBottomOpen] = useState(false)
  const [topOpen, setTopOpen] = useState(false)

  return (
    <>
      <button onClick={() => setBottomOpen(true)} type="button">
        打开底层弹窗
      </button>
      <button onClick={() => setTopOpen(true)} type="button">
        打开顶层弹窗
      </button>
      {bottomOpen ? <PortalDialog label="底层弹窗" onClose={() => setBottomOpen(false)} /> : null}
      {topOpen ? (
        <PortalDialog
          label="顶层弹窗"
          onClose={() => setTopOpen(false)}
          onRemoveBottom={() => setBottomOpen(false)}
        />
      ) : null}
    </>
  )
}

describe('useDialogFocus dialog stack', () => {
  it('lets only the topmost dialog handle Escape and Tab trapping', async () => {
    const user = userEvent.setup()
    render(<NestedDialogHarness />)
    const parentTrigger = screen.getByRole('button', { name: '打开父弹窗' })

    await user.click(parentTrigger)
    const childTrigger = screen.getByRole('button', { name: '打开子弹窗' })
    await waitFor(() => expect(childTrigger).toHaveFocus())
    await user.click(childTrigger)
    await waitFor(() => expect(screen.getByRole('button', { name: '关闭子弹窗' })).toHaveFocus())

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '子弹窗' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '父弹窗' })).toBeInTheDocument()
    expect(childTrigger).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '关闭父弹窗' })).toHaveFocus()
    await user.tab()
    expect(childTrigger).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '父弹窗' })).not.toBeInTheDocument()
    expect(parentTrigger).toHaveFocus()
  })

  it('removes stale stack entries when nested dialogs unmount unexpectedly', async () => {
    const user = userEvent.setup()
    const first = render(<NestedDialogHarness />)
    await user.click(screen.getByRole('button', { name: '打开父弹窗' }))
    await user.click(screen.getByRole('button', { name: '打开子弹窗' }))

    expect(() => first.unmount()).not.toThrow()

    render(<NestedDialogHarness />)
    await user.click(screen.getByRole('button', { name: '打开父弹窗' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '父弹窗' })).not.toBeInTheDocument()
  })

  it('does not restore bottom-dialog focus while an independent top portal remains open', async () => {
    const user = userEvent.setup()
    render(<IndependentPortalHarness />)
    await user.click(screen.getByRole('button', { name: '打开底层弹窗' }))
    await user.click(screen.getByRole('button', { name: '打开顶层弹窗' }))
    const removeBottom = screen.getByRole('button', { name: '卸载底层弹窗' })

    await user.click(removeBottom)

    expect(screen.queryByRole('dialog', { name: '底层弹窗' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '顶层弹窗' })).toBeInTheDocument()
    expect(removeBottom).toHaveFocus()
  })
})
