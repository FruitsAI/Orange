import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAmbientLight } from './useAmbientLight'

describe('useAmbientLight', () => {
  const originalMatchMedia = window.matchMedia
  const originalRequestAnimationFrame = window.requestAnimationFrame
  const originalCancelAnimationFrame = window.cancelAnimationFrame
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  let frameCallback: FrameRequestCallback | undefined

  beforeEach(() => {
    frameCallback = undefined
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 100 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 })
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 17
    })
    window.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    window.requestAnimationFrame = originalRequestAnimationFrame
    window.cancelAnimationFrame = originalCancelAnimationFrame
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
    vi.restoreAllMocks()
  })

  it('returns a ref and registers one pointer listener', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const { result } = renderHook(() => useAmbientLight<HTMLDivElement>())

    expect(result.current).toHaveProperty('current')
    expect(addEventListener.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(1)
  })

  it('coalesces pointer movement into one frame and updates only the background element', () => {
    const querySelectorAll = vi.spyOn(document, 'querySelectorAll')
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    const { result } = renderHook(() => useAmbientLight<HTMLDivElement>())
    const background = document.createElement('div')
    result.current.current = background

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 25 }))
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 80, clientY: 75 }))
    })

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(querySelectorAll).not.toHaveBeenCalled()
    expect(getBoundingClientRect).not.toHaveBeenCalled()

    act(() => frameCallback?.(0))

    expect(background.style.getPropertyValue('--light-x')).toBe('80%')
    expect(background.style.getPropertyValue('--light-y')).toBe('75%')
  })

  it('removes the listener and cancels a pending frame on unmount', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useAmbientLight<HTMLDivElement>())

    act(() => window.dispatchEvent(new PointerEvent('pointermove', { clientX: 1, clientY: 1 })))
    unmount()

    expect(removeEventListener.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(1)
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(17)
  })

  it('does not register or update when reduced motion is preferred', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const { result } = renderHook(() => useAmbientLight<HTMLDivElement>())
    const background = document.createElement('div')
    result.current.current = background

    act(() => window.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 50 })))

    expect(addEventListener.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(0)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
    expect(background.style.getPropertyValue('--light-x')).toBe('')
  })
})
