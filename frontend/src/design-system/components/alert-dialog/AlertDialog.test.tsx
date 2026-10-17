import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AlertDialog } from './AlertDialog'

describe('AlertDialog', () => {
  it('composes Modal and Button with labelled alert-dialog semantics', async () => {
    const onAction = vi.fn()
    const onClose = vi.fn()
    render(
      <AlertDialog
        action="删除"
        cancel="取消"
        description="删除后无法恢复。"
        onAction={onAction}
        onClose={onClose}
        open
        title="删除项目？"
      />,
    )

    const dialog = screen.getByRole('alertdialog', { name: '删除项目？' })
    expect(dialog).toHaveAccessibleDescription('删除后无法恢复。')

    await userEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(onAction).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('locks dismissal and duplicate actions while pending', async () => {
    const onAction = vi.fn()
    const onClose = vi.fn()
    render(
      <AlertDialog
        action="保存"
        description="正在写入数据。"
        onAction={onAction}
        onClose={onClose}
        open
        pending
        title="确认保存？"
      />,
    )

    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})
