import {
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start'

interface PopoverContextValue {
  close: () => void
  contentId: string
  open: boolean
  placement: PopoverPlacement
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
  const rootRef = useRef<HTMLDivElement | null>(null)
  const baseId = useId().replaceAll(':', '')

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [controlledOpen, onOpenChange],
  )

  const context: PopoverContextValue = {
    close: () => setOpen(false),
    contentId: `${baseId}-content`,
    open,
    placement,
    setTrigger: (node) => {
      triggerRef.current = node
    },
    toggle: () => setOpen(!open),
    triggerId: `${baseId}-trigger`,
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, setOpen])

  return (
    <PopoverContext.Provider value={context}>
      <div className={['ods-popover-root', className].filter(Boolean).join(' ')} ref={rootRef}>
        {children}
      </div>
    </PopoverContext.Provider>
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
    'aria-haspopup': 'dialog',
    id: triggerId,
    onClick: (event) => {
      childProps.onClick?.(event)
      toggle()
    },
    ref: setTrigger,
  })
}

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  role?: string
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent({ children, className, role = 'dialog', ...props }, ref) {
    const { contentId, open, placement, triggerId } = usePopoverContext()
    if (!open) return null

    return (
      <div
        {...props}
        aria-labelledby={triggerId}
        className={['ods-popover', className].filter(Boolean).join(' ')}
        data-placement={placement}
        data-slot="popover"
        id={contentId}
        ref={ref}
        role={role}
      >
        {children}
      </div>
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
