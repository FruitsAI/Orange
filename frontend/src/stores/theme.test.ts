import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_OPTIONS, THEME_TRANSITION_DURATION, useThemeStore } from './theme'

interface MediaController {
  dispatchSystemTheme: (dark: boolean) => void
  listenerCount: () => number
  setReducedMotion: (reduced: boolean) => void
}

const installMatchMedia = (initialDark = false): MediaController => {
  let systemDark = initialDark
  let reducedMotion = false
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>()

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      const queryListeners = listeners.get(query) ?? new Set()
      listeners.set(query, queryListeners)
      return {
        matches: query.includes('prefers-reduced-motion') ? reducedMotion : systemDark,
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          queryListeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          queryListeners.delete(listener),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }),
  )

  return {
    dispatchSystemTheme(dark) {
      systemDark = dark
      listeners
        .get('(prefers-color-scheme: dark)')
        ?.forEach((listener) => listener({ matches: dark } as MediaQueryListEvent))
    },
    listenerCount: () => listeners.get('(prefers-color-scheme: dark)')?.size ?? 0,
    setReducedMotion(reduced) {
      reducedMotion = reduced
    },
  }
}

describe('theme store', () => {
  let cleanupThemeListener: (() => void) | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('theme-transitioning')
    useThemeStore.setState({ theme: 'auto', effectiveTheme: 'light' })
  })

  afterEach(() => {
    cleanupThemeListener?.()
    cleanupThemeListener = undefined
    act(() => vi.runOnlyPendingTimers())
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    document.body.style.display = ''
    document.documentElement.classList.remove('theme-transitioning')
  })

  it('shares the three product theme modes and labels', () => {
    expect(THEME_OPTIONS).toEqual([
      expect.objectContaining({ label: '跟随系统', value: 'auto' }),
      expect.objectContaining({ label: '亮色', value: 'light' }),
      expect.objectContaining({ label: '深色', value: 'dark' }),
    ])
  })

  it('persists explicit and automatic theme modes', () => {
    installMatchMedia()

    useThemeStore.getState().setTheme('dark')
    expect(window.localStorage.getItem('theme')).toBe('dark')
    useThemeStore.getState().setTheme('auto')

    expect(window.localStorage.getItem('theme')).toBe('auto')
  })

  it('follows system changes only in auto mode', () => {
    const media = installMatchMedia(false)
    cleanupThemeListener = useThemeStore.getState().initializeTheme()

    expect(useThemeStore.getState().effectiveTheme).toBe('light')
    act(() => media.dispatchSystemTheme(true))
    expect(useThemeStore.getState().effectiveTheme).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    useThemeStore.getState().setTheme('light')
    act(() => media.dispatchSystemTheme(false))
    act(() => media.dispatchSystemTheme(true))

    expect(useThemeStore.getState().effectiveTheme).toBe('light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('adds a short root transition for interactive changes and resets rapid switches', () => {
    installMatchMedia(false)

    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement).toHaveClass('theme-transitioning')

    act(() => vi.advanceTimersByTime(180))
    useThemeStore.getState().setTheme('light')
    act(() => vi.advanceTimersByTime(THEME_TRANSITION_DURATION - 1))
    expect(document.documentElement).toHaveClass('theme-transitioning')

    act(() => vi.advanceTimersByTime(1))
    expect(document.documentElement).not.toHaveClass('theme-transitioning')
  })

  it('rebuilds the body layout after changing the root theme for WebKit', () => {
    installMatchMedia(false)
    document.body.style.display = 'block'
    const layoutRead = vi.spyOn(document.body, 'offsetHeight', 'get')
    layoutRead.mockClear()
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 24 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 960 })
    const restoreScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    useThemeStore.getState().setTheme('dark')

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(layoutRead).toHaveBeenCalled()
    expect(document.body.style.display).toBe('block')
    expect(restoreScroll).toHaveBeenCalledWith(24, 960)
  })

  it('does not animate the initial application or reduced-motion changes', () => {
    const media = installMatchMedia(true)
    const initialLayoutRead = vi.spyOn(document.body, 'offsetHeight', 'get')
    initialLayoutRead.mockClear()

    cleanupThemeListener = useThemeStore.getState().initializeTheme()
    expect(initialLayoutRead).not.toHaveBeenCalled()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).not.toHaveClass('theme-transitioning')

    media.setReducedMotion(true)
    useThemeStore.getState().setTheme('light')
    expect(document.documentElement).not.toHaveClass('theme-transitioning')
  })

  it('removes the media listener and pending transition during cleanup', () => {
    const media = installMatchMedia(false)
    cleanupThemeListener = useThemeStore.getState().initializeTheme()
    expect(media.listenerCount()).toBe(1)

    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement).toHaveClass('theme-transitioning')
    cleanupThemeListener()
    cleanupThemeListener = undefined

    expect(media.listenerCount()).toBe(0)
    expect(document.documentElement).not.toHaveClass('theme-transitioning')
  })
})
