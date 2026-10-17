import {
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import {
  isElementInOverlayLayerSubtree,
  isTopOverlayLayer,
  OverlayLayerProvider,
  setOverlayLayerElement,
  useOverlayLayer,
  type OverlayLayerToken,
} from '@/hooks/overlayStack'

const assignRef = <T,>(ref: Ref<T> | undefined, node: T | null) => {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as MutableRefObject<T | null>).current = node
}

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start'
export type PopoverPadding = 'none' | 'sm' | 'md'

interface PopoverContextValue {
  close: () => void
  contentId: string
  getTrigger: () => HTMLElement | null
  layerToken: OverlayLayerToken
  layerZIndex: CSSProperties['zIndex']
  open: boolean
  openPopover: () => void
  placement: PopoverPlacement
  setContent: (node: HTMLElement | null) => void
  setTrigger: (node: HTMLElement | null) => void
  toggle: () => void
  triggerId: string
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

const usePopoverContext = () => {
  const context = useContext(PopoverContext)
  if (!context) throw new Error('Popover subcomponents must be used inside Popover.Root')
  return context
}

export interface PopoverRootProps {
  children: ReactNode
  className?: string
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
  placement?: PopoverPlacement
}

export function PopoverRoot({
  children,
  className,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
  placement = 'bottom-start',
}: PopoverRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const baseId = useId().replaceAll(':', '')
  const { token: layerToken, zIndex: layerZIndex } = useOverlayLayer({
    kind: 'popover',
    open,
  })

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [controlledOpen, onOpenChange],
  )

  const context: PopoverContextValue = {
    close: () => {
      setOpen(false)
      queueMicrotask(() => triggerRef.current?.focus())
    },
    contentId: `${baseId}-content`,
    getTrigger: () => triggerRef.current,
    layerToken,
    layerZIndex,
    open,
    openPopover: () => setOpen(true),
    placement,
    setContent: (node) => {
      contentRef.current = node
    },
    setTrigger: (node) => {
      triggerRef.current = node
    },
    toggle: () => setOpen(!open),
    triggerId: `${baseId}-trigger`,
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        rootRef.current?.contains(target) ||
        contentRef.current?.contains(target) ||
        isElementInOverlayLayerSubtree(layerToken, target)
      ) {
        return
      }
      setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isTopOverlayLayer(layerToken)) return
      event.preventDefault()
      setOpen(false)
      queueMicrotask(() => triggerRef.current?.focus())
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [layerToken, open, setOpen])

  return (
    <OverlayLayerProvider value={layerToken}>
      <PopoverContext.Provider value={context}>
        <div className={['ods-popover-root', className].filter(Boolean).join(' ')} ref={rootRef}>
          {children}
        </div>
      </PopoverContext.Provider>
    </OverlayLayerProvider>
  )
}

export interface PopoverTriggerProps {
  children: ReactElement<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { contentId, open, setTrigger, toggle, triggerId } = usePopoverContext()
  const childProps = children.props

  return cloneElement(children, {
    'aria-controls': open ? contentId : undefined,
    'aria-expanded': open,
    'aria-haspopup': childProps['aria-haspopup'] ?? 'dialog',
    id: childProps.id ?? triggerId,
    onClick: (event) => {
      childProps.onClick?.(event)
      if (!event.defaultPrevented) toggle()
    },
    ref: (node: HTMLElement | null) => {
      setTrigger(node)
      assignRef(childProps.ref, node)
    },
  })
}

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  initialFocus?: string | string[]
  padding?: PopoverPadding
  role?: string
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(
    { children, className, initialFocus, padding = 'sm', role = 'dialog', style, ...props },
    ref,
  ) {
    const {
      contentId,
      getTrigger,
      layerToken,
      layerZIndex,
      open,
      placement,
      setContent,
      triggerId,
    } = usePopoverContext()
    const contentRef = useRef<HTMLDivElement | null>(null)
    const didInitialFocusRef = useRef(false)

    useLayoutEffect(() => {
      if (!open) return

      const updatePosition = () => {
        const trigger = getTrigger()
        const content = contentRef.current
        if (!trigger || !content) return

        const margin = 8
        const gap = 8
        const triggerRect = trigger.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const alignEnd = placement === 'bottom-end'
        const preferTop = placement === 'top-start'
        let left = alignEnd ? triggerRect.right - contentRect.width : triggerRect.left
        let top = preferTop ? triggerRect.top - contentRect.height - gap : triggerRect.bottom + gap

        if (!preferTop && top + contentRect.height > viewportHeight - margin) {
          const flippedTop = triggerRect.top - contentRect.height - gap
          if (flippedTop >= margin) top = flippedTop
        } else if (preferTop && top < margin) {
          const flippedBottom = triggerRect.bottom + gap
          if (flippedBottom + contentRect.height <= viewportHeight - margin) top = flippedBottom
        }

        left = Math.max(
          margin,
          Math.min(left, Math.max(margin, viewportWidth - contentRect.width - margin)),
        )
        top = Math.max(
          margin,
          Math.min(top, Math.max(margin, viewportHeight - contentRect.height - margin)),
        )

        content.style.left = `${left}px`
        content.style.top = `${top}px`
      }

      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }, [getTrigger, open, placement])

    useLayoutEffect(() => {
      if (!open) {
        didInitialFocusRef.current = false
        return
      }
      if (!initialFocus || didInitialFocusRef.current) return

      const selectors = Array.isArray(initialFocus) ? initialFocus : [initialFocus]
      const focusTarget = selectors
        .map((selector) => contentRef.current?.querySelector<HTMLElement>(selector))
        .find((element): element is HTMLElement => Boolean(element))
      if (focusTarget) {
        didInitialFocusRef.current = true
        focusTarget.focus()
      }
    }, [initialFocus, open])

    if (!open || typeof document === 'undefined') return null

    const labelledBy = props['aria-label']
      ? undefined
      : (props['aria-labelledby'] ?? getTrigger()?.id ?? triggerId)

    return createPortal(
      <div
        {...props}
        aria-labelledby={labelledBy}
        className={['ods-popover', className].filter(Boolean).join(' ')}
        data-padding={padding}
        data-placement={placement}
        data-slot="popover"
        id={contentId}
        ref={(node) => {
          contentRef.current = node
          setContent(node)
          setOverlayLayerElement(layerToken, node)
          assignRef(ref, node)
        }}
        role={role}
        style={{ ...style, position: 'fixed', zIndex: layerZIndex }}
      >
        {children}
      </div>,
      document.body,
    )
  },
)

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Popover = {
  Content: PopoverContent,
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
}

// A hook shares the same module so Dropdown can consume the root context without exposing it.
// eslint-disable-next-line react-refresh/only-export-components
export const usePopoverClose = () => usePopoverContext().close

// eslint-disable-next-line react-refresh/only-export-components
export const usePopoverOpen = () => usePopoverContext().openPopover
