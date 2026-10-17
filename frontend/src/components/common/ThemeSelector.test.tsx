import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@/test/render'
import { useThemeStore } from '@/stores/theme'
import ThemeSelector from './ThemeSelector'

describe('ThemeSelector', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useThemeStore.setState({ effectiveTheme: 'dark', theme: 'auto' })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('color-scheme'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('theme-transitioning')
  })

  it('uses the ODS icon button and labels the effective appearance', () => {
    render(<ThemeSelector />)

    const trigger = screen.getByRole('button', { name: '主题：跟随系统，当前显示深色' })
    expect(trigger).toHaveClass('ods-button', 'ods-icon-button')
    expect(trigger).toHaveAttribute('title', '主题：跟随系统，当前显示深色')
    expect(trigger.querySelector('i')).toHaveClass('ri-moon-line')
  })

  it('composes the ODS popover and listbox with all theme modes', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector />)

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))

    const listbox = screen.getByRole('listbox', { name: '主题模式' })
    expect(listbox).toHaveClass('ods-listbox')
    expect(listbox.closest('.ods-popover')).toHaveClass('theme-selector__popover')
    expect(within(listbox).getAllByRole('option')).toHaveLength(3)
    expect(within(listbox).getByRole('option', { name: '跟随系统' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('selects a mode, closes the popover, and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector />)
    const trigger = screen.getByRole('button', { name: /主题：跟随系统/ })

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: '亮色' }))

    expect(useThemeStore.getState().theme).toBe('light')
    expect(window.localStorage.getItem('theme')).toBe('light')
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('supports listbox keyboard navigation and Escape dismissal', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector />)
    const trigger = screen.getByRole('button', { name: /主题：跟随系统/ })

    await user.click(trigger)
    const automatic = screen.getByRole('option', { name: '跟随系统' })
    await waitFor(() => expect(automatic).toHaveFocus())
    await user.keyboard('{ArrowDown}{Enter}')
    expect(useThemeStore.getState().theme).toBe('light')

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
