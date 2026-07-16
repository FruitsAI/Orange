import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dropdown } from './Dropdown'

describe('Dropdown', () => {
  it('opens the menu and fires the item action, then closes', async () => {
    const onSelect = vi.fn()
    render(
      <Dropdown>
        <Dropdown.Trigger>
          <button type="button">操作</button>
        </Dropdown.Trigger>
        <Dropdown.Menu label="操作菜单">
          <Dropdown.Item onSelect={onSelect}>编辑</Dropdown.Item>
          <Dropdown.Item tone="danger">删除</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>,
    )

    await userEvent.click(screen.getByRole('button', { name: '操作' }))
    const edit = screen.getByRole('menuitem', { name: '编辑' })
    await userEvent.click(edit)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menuitem', { name: '编辑' })).not.toBeInTheDocument()
  })
})
