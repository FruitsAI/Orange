import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('theme bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('theme-transitioning')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['dark', false],
    ['auto', true],
  ])('applies a stored %s theme before render', async (storedTheme, systemPrefersDark) => {
    window.localStorage.setItem('theme', storedTheme)
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: systemPrefersDark && query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )

    const { applyThemeBeforeRender } = await import('./theme')
    applyThemeBeforeRender()

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).not.toHaveClass('theme-transitioning')
  })
})
