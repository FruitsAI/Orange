import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { render, screen } from '@/test/render'
import SettingsView from './SettingsView'

describe('SettingsView appearance theme controls', () => {
  const originalRefreshUser = useAuthStore.getState().refreshUser

  beforeEach(() => {
    window.localStorage.clear()
    useThemeStore.setState({ effectiveTheme: 'light', theme: 'auto' })
    useAuthStore.setState({ refreshUser: vi.fn().mockResolvedValue(undefined) })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduced-motion'),
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
    useAuthStore.setState({ refreshUser: originalRefreshUser })
    vi.unstubAllGlobals()
  })

  it('uses native radio controls that stay synchronized with the theme store', async () => {
    const user = userEvent.setup()
    render(<SettingsView />, { initialEntries: ['/settings?tab=appearance'] })

    const automatic = screen.getByRole('radio', { name: '跟随系统' })
    const light = screen.getByRole('radio', { name: '亮色' })
    const dark = screen.getByRole('radio', { name: '深色' })
    expect(automatic).toBeChecked()
    expect(light).not.toBeChecked()
    expect(dark).not.toBeChecked()

    await user.click(dark)
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(dark).toBeChecked()
    expect(window.localStorage.getItem('theme')).toBe('dark')
  })
})
