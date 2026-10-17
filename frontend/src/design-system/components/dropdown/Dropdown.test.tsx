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

    const trigger = screen.getByRole('button', { name: '操作' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    await userEvent.click(trigger)
    const edit = screen.getByRole('menuitem', { name: '编辑' })
    await userEvent.click(edit)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menuitem', { name: '编辑' })).not.toBeInTheDocument()
  })

  it('opens, navigates, and selects from the keyboard, then restores trigger focus', async () => {
    const edit = vi.fn()
    const remove = vi.fn()
    render(
      <Dropdown>
        <Dropdown.Trigger>
          <button type="button">操作</button>
        </Dropdown.Trigger>
        <Dropdown.Menu label="操作菜单">
          <Dropdown.Item onSelect={edit}>编辑</Dropdown.Item>
          <Dropdown.Item onSelect={remove}>删除</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>,
    )

    const trigger = screen.getByRole('button', { name: '操作' })
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: '编辑' })).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: '删除' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: '编辑' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(edit).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()

    await userEvent.keyboard(' ')
    expect(screen.getByRole('menuitem', { name: '编辑' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(edit).toHaveBeenCalledTimes(2)
    expect(trigger).toHaveFocus()

    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: '编辑' })).toHaveFocus()
  })

  it('composes public event handlers and lets them cancel internal menu behavior', async () => {
    const onItemClick = vi.fn()
    const onItemSelect = vi.fn()
    const onMenuKeyDown = vi.fn()
    render(
      <Dropdown>
        <Dropdown.Trigger>
          <button type="button">操作</button>
        </Dropdown.Trigger>
        <Dropdown.Menu
          label="操作菜单"
          onKeyDown={(event) => {
            onMenuKeyDown()
            event.preventDefault()
          }}
        >
          <Dropdown.Item
            onClick={(event) => {
              onItemClick()
              event.preventDefault()
            }}
            onSelect={onItemSelect}
          >
            编辑
          </Dropdown.Item>
          <Dropdown.Item>删除</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>,
    )

    await userEvent.click(screen.getByRole('button', { name: '操作' }))
    const edit = screen.getByRole('menuitem', { name: '编辑' })
    edit.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(onMenuKeyDown).toHaveBeenCalledTimes(1)
    expect(edit).toHaveFocus()

    await userEvent.click(edit)
    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemSelect).not.toHaveBeenCalled()
    expect(edit).toBeInTheDocument()
  })
})
