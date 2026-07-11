import { useEffect, useRef, type RefObject } from 'react'

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value))

export function useAmbientLight<T extends HTMLElement>(): RefObject<T | null> {
  const elementRef = useRef<T | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frameId: number | null = null
    let pointerX = 0
    let pointerY = 0

    const updateLight = () => {
      frameId = null
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

    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])

  return elementRef
}
