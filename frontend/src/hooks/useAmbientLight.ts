import { useEffect, useRef, type RefObject } from 'react'

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value))

export function useAmbientLight<T extends HTMLElement>(): RefObject<T | null> {
  const elementRef = useRef<T | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frameId: number | null = null
    let pointerX = 0
    let pointerY = 0
    let pointerListening = false
    let enabled = false

    const updateLight = () => {
      frameId = null
      if (!enabled) return
      const element = elementRef.current
      if (!element) return

      const x = clampPercentage((pointerX / window.innerWidth) * 100)
      const y = clampPercentage((pointerY / window.innerHeight) * 100)
      element.style.setProperty('--light-x', `${x}%`)
      element.style.setProperty('--light-y', `${y}%`)
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      if (frameId === null) frameId = window.requestAnimationFrame(updateLight)
    }

    const start = () => {
      if (pointerListening) return
      enabled = true
      pointerListening = true
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
    }

    const stop = () => {
      enabled = false
      if (pointerListening) {
        pointerListening = false
        window.removeEventListener('pointermove', handlePointerMove)
      }
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
        frameId = null
      }
    }

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (event.matches) stop()
      else start()
    }

    if (mediaQuery.matches) stop()
    else start()

    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handleMotionPreference)
    else mediaQuery.addListener(handleMotionPreference)

    return () => {
      stop()
      if (mediaQuery.removeEventListener)
        mediaQuery.removeEventListener('change', handleMotionPreference)
      else mediaQuery.removeListener(handleMotionPreference)
    }
  }, [])

  return elementRef
}
