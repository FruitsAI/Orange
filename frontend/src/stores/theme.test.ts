import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from './theme'

describe('theme store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    useThemeStore.setState({ theme: 'auto', effectiveTheme: 'light' })

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
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

  it('follows a dark system preference in auto mode', () => {
    const cleanup = useThemeStore.getState().initializeTheme()

    expect(useThemeStore.getState().effectiveTheme).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    cleanup()
  })
})
