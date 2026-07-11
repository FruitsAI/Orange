import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from './theme'

describe('theme store', () => {
  let cleanupThemeListener: (() => void) | undefined

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

  afterEach(() => {
    cleanupThemeListener?.()
    cleanupThemeListener = undefined
    vi.unstubAllGlobals()
  })

  it('follows a dark system preference in auto mode', () => {
    cleanupThemeListener = useThemeStore.getState().initializeTheme()

    expect(useThemeStore.getState().effectiveTheme).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('applies the light theme to the document', () => {
    useThemeStore.getState().setTheme('light')

    expect(useThemeStore.getState().effectiveTheme).toBe('light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('applies the dark theme to the document', () => {
    useThemeStore.getState().setTheme('dark')

    expect(useThemeStore.getState().effectiveTheme).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})
