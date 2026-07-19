import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useConfirm } from '@/composables/useConfirm'
import { Button } from '@/design-system'
import { render, screen } from '@/test/render'

function ConfirmationHarness() {
  const { confirm } = useConfirm()
  const [result, setResult] = useState('等待确认')

  return (
    <>
      <Button
        onClick={async () => {
          const confirmed = await confirm({
            actionLabel: '删除',
            actionVariant: 'danger',
            message: '删除后无法恢复。',
            title: '删除项目？',
          })
          setResult(confirmed ? '已确认' : '已取消')
        }}
      >
        打开确认
      </Button>
      <output>{result}</output>
    </>
  )
}

describe('ConfirmProvider', () => {
  it('resolves a confirmation through the ODS alert dialog', async () => {
    const user = userEvent.setup()
    render(<ConfirmationHarness />)

    await user.click(screen.getByRole('button', { name: '打开确认' }))
    expect(screen.getByRole('alertdialog', { name: '删除项目？' })).toHaveAccessibleDescription(
      '删除后无法恢复。',
    )
    await user.click(screen.getByRole('button', { name: '删除' }))

    expect(screen.getByText('已确认')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resolves false when the user cancels', async () => {
    const user = userEvent.setup()
    render(<ConfirmationHarness />)

    await user.click(screen.getByRole('button', { name: '打开确认' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(screen.getByText('已取消')).toBeInTheDocument()
  })
})
