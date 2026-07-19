import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type UIEvent,
} from 'react'

export type ScrollShadowOrientation = 'vertical' | 'horizontal'

export interface ScrollShadowProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: ScrollShadowOrientation
}

const EDGE_EPSILON = 1

export const ScrollShadow = forwardRef<HTMLDivElement, ScrollShadowProps>(function ScrollShadow(
  { className, onScroll, orientation = 'vertical', ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLDivElement | null>(null)

  const setRef = (node: HTMLDivElement | null) => {
    innerRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const updateEdges = useCallback(() => {
    const el = innerRef.current
    if (!el) return
    const start =
      orientation === 'vertical' ? el.scrollTop > EDGE_EPSILON : el.scrollLeft > EDGE_EPSILON
    const end =
      orientation === 'vertical'
        ? el.scrollTop + el.clientHeight < el.scrollHeight - EDGE_EPSILON
        : el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_EPSILON
    el.setAttribute('data-at-start', String(!start))
    el.setAttribute('data-at-end', String(!end))
  }, [orientation])

  useEffect(() => {
    updateEdges()
    const el = innerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateEdges)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateEdges])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    updateEdges()
    onScroll?.(event)
  }

  return (
    <div
      {...props}
      className={['ods-scroll-shadow', className].filter(Boolean).join(' ')}
      data-orientation={orientation}
      data-slot="scroll-shadow"
      onScroll={handleScroll}
      ref={setRef}
    />
  )
})
