import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Listbox } from './Listbox'

describe('Listbox', () => {
  it('uses one roving tab stop and moves it with arrow keys', async () => {
    const onSelect = vi.fn()
    render(
      <>
        <Listbox aria-label="主题模式" onSelect={onSelect} selectedValues={['auto']}>
          <Listbox.Item value="auto">跟随系统</Listbox.Item>
          <Listbox.Item value="light">亮色</Listbox.Item>
          <Listbox.Item value="dark">深色</Listbox.Item>
        </Listbox>
        <button type="button">下一个控件</button>
      </>,
    )

    const automatic = screen.getByRole('option', { name: '跟随系统' })
    const light = screen.getByRole('option', { name: '亮色' })
    const dark = screen.getByRole('option', { name: '深色' })

    expect(automatic).toHaveAttribute('tabindex', '0')
    expect(light).toHaveAttribute('tabindex', '-1')
    expect(dark).toHaveAttribute('tabindex', '-1')

    automatic.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(light).toHaveFocus()
    expect(automatic).toHaveAttribute('tabindex', '-1')
    expect(light).toHaveAttribute('tabindex', '0')
    expect(dark).toHaveAttribute('tabindex', '-1')

    await userEvent.tab()
    expect(screen.getByRole('button', { name: '下一个控件' })).toHaveFocus()
  })

  it('falls back to the first enabled option when nothing is selected', () => {
    render(
      <Listbox aria-label="筛选" onSelect={() => undefined}>
        <Listbox.Item disabled value="disabled">
          不可用
        </Listbox.Item>
        <Listbox.Item value="available">可用</Listbox.Item>
      </Listbox>,
    )

    expect(screen.getByRole('option', { name: '不可用' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('option', { name: '可用' })).toHaveAttribute('tabindex', '0')
  })

  it('composes the public keydown handler and lets it cancel internal navigation', async () => {
    const onKeyDown = vi.fn()
    render(
      <Listbox
        aria-label="主题模式"
        onKeyDown={(event) => {
          onKeyDown()
          event.preventDefault()
        }}
        onSelect={() => undefined}
        selectedValues={['auto']}
      >
        <Listbox.Item value="auto">跟随系统</Listbox.Item>
        <Listbox.Item value="light">亮色</Listbox.Item>
      </Listbox>,
    )

    const automatic = screen.getByRole('option', { name: '跟随系统' })
    automatic.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(automatic).toHaveFocus()
  })
})
