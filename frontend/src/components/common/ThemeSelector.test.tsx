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

  it('labels the trigger with the selected mode and effective appearance', () => {
    render(<ThemeSelector />)

    const trigger = screen.getByRole('button', { name: '主题：跟随系统，当前显示深色' })
    expect(trigger).toHaveAttribute('title', '主题：跟随系统，当前显示深色')
    expect(trigger.querySelector('i')).toHaveClass('ri-moon-line')
  })

  it('portals a no-drag listbox with all modes and the current selection', async () => {
    const user = userEvent.setup()
    const { container } = render(<ThemeSelector />)

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))

    const listbox = screen.getByRole('listbox', { name: '主题模式' })
    expect(listbox.parentElement).toBe(document.body)
    expect(listbox).toHaveClass('theme-selector__menu', 'app-topbar-portal')
    expect(container).not.toContainElement(listbox)
    expect(within(listbox).getAllByRole('option')).toHaveLength(3)
    const options = within(listbox).getAllByRole('option')
    expect(options.map((option) => option.tabIndex)).toEqual([0, -1, -1])
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    const unselectedOption = within(listbox).getByRole('option', { name: '亮色' })
    expect(unselectedOption.querySelector('.theme-selector__label')).toHaveTextContent('亮色')
    expect(unselectedOption.lastElementChild).toHaveClass('theme-selector__check')
    expect(screen.getByRole('button', { name: '关闭主题菜单' })).toHaveAttribute('tabindex', '-1')
  })

  it('positions the portal within a narrow viewport', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('innerWidth', 180)
    render(<ThemeSelector />)
    const trigger = screen.getByRole('button', { name: /主题：跟随系统/ })
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 62,
      height: 38,
      left: 132,
      right: 170,
      top: 24,
      width: 38,
      x: 132,
      y: 24,
      toJSON: () => ({}),
    })

    await user.click(trigger)
    const listbox = screen.getByRole('listbox', { name: '主题模式' })
    expect(listbox).toHaveStyle({ left: '12px', top: '72px' })
  })

  it('selects a mode, closes the menu, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector />)
    const trigger = screen.getByRole('button', { name: /主题：跟随系统/ })

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: '亮色' }))

    expect(useThemeStore.getState().theme).toBe('light')
    expect(window.localStorage.getItem('theme')).toBe('light')
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('supports arrow navigation and keyboard selection', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector />)

    await user.click(screen.getByRole('button', { name: /主题：跟随系统/ }))
    const automatic = screen.getByRole('option', { name: '跟随系统' })
    await waitFor(() => expect(automatic).toHaveFocus())
    await user.keyboard('{ArrowDown}')
    expect(automatic).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('option', { name: '亮色' })).toHaveAttribute('tabindex', '0')
    await user.keyboard('{Enter}')

    expect(useThemeStore.getState().theme).toBe('light')
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
  })

  it('closes on Escape or an outside click and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(<ThemeSelector />)
    const trigger = screen.getByRole('button', { name: /主题：跟随系统/ })

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: '关闭主题菜单' }))
    expect(screen.queryByRole('listbox', { name: '主题模式' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
