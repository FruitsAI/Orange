import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from './useReducedMotion'

type MotionListener = (event: MediaQueryListEvent) => void

function createMediaQuery(initialMatches: boolean, modern = true) {
  let matches = initialMatches
  const listeners = new Set<MotionListener>()
  const addEventListener = vi.fn((_type: string, listener: MotionListener) =>
    listeners.add(listener),
  )
  const removeEventListener = vi.fn((_type: string, listener: MotionListener) =>
    listeners.delete(listener),
  )
  const addListener = vi.fn((listener: MotionListener) => listeners.add(listener))
  const removeListener = vi.fn((listener: MotionListener) => listeners.delete(listener))
  const mediaQuery = {
    get matches() {
      return matches
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: modern ? addEventListener : undefined,
    removeEventListener: modern ? removeEventListener : undefined,
    addListener,
    removeListener,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList

  return {
    addEventListener,
    addListener,
    mediaQuery,
    removeEventListener,
    removeListener,
    update(nextMatches: boolean) {
      matches = nextMatches
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is safe during server rendering', () => {
    vi.stubGlobal('window', undefined)

    function ServerProbe() {
      return <span>{useReducedMotion() ? 'reduce' : 'animate'}</span>
    }

    expect(renderToString(<ServerProbe />)).toContain('animate')
  })

  it('uses the initial media-query value and updates in both directions', () => {
    const query = createMediaQuery(true)
    vi.spyOn(window, 'matchMedia').mockReturnValue(query.mediaQuery)
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(true)
    act(() => query.update(false))
    expect(result.current).toBe(false)
    act(() => query.update(true))
    expect(result.current).toBe(true)
  })

  it('removes the modern change listener on unmount', () => {
    const query = createMediaQuery(false)
    vi.spyOn(window, 'matchMedia').mockReturnValue(query.mediaQuery)
    const { unmount } = renderHook(() => useReducedMotion())

    expect(query.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    unmount()
    expect(query.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('supports legacy addListener and removeListener media queries', () => {
    const query = createMediaQuery(false, false)
    vi.spyOn(window, 'matchMedia').mockReturnValue(query.mediaQuery)
    const { result, unmount } = renderHook(() => useReducedMotion())

    expect(query.addListener).toHaveBeenCalledWith(expect.any(Function))
    act(() => query.update(true))
    expect(result.current).toBe(true)
    unmount()
    expect(query.removeListener).toHaveBeenCalledWith(expect.any(Function))
  })
})
