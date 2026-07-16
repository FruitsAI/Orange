import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useRef,
  type HTMLAttributes,
  type MutableRefObject,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus } from '@/hooks/useDialogFocus'

export type DrawerPlacement = 'right' | 'left' | 'top' | 'bottom'
export type DrawerSize = 'sm' | 'md' | 'lg'

interface DrawerContextValue {
  onClose: () => void
  titleId: string
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

const useDrawerContext = () => {
  const context = useContext(DrawerContext)
  if (!context) throw new Error('Drawer subcomponents must be used inside Drawer.Root')
  return context
}

const mergeRefs =
  <T,>(...refs: Array<Ref<T> | undefined>) =>
  (node: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as MutableRefObject<T>).current = node
    }
  }

export interface DrawerRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  dismissable?: boolean
  onClose: () => void
  open: boolean
  placement?: DrawerPlacement
  size?: DrawerSize
}

const DrawerRoot = forwardRef<HTMLDivElement, DrawerRootProps>(function DrawerRoot(
  {
    children,
    className,
    dismissable = true,
    onClose,
    open,
    placement = 'right',
    size = 'md',
    ...props
  },
  ref,
) {
  const titleId = useId().replaceAll(':', '')
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus({ dialogRef, onClose, open })

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <DrawerContext.Provider value={{ onClose, titleId }}>
      <div
        className="ods-drawer__scrim"
        data-slot="scrim"
        onMouseDown={(event) => {
          if (dismissable && event.target === event.currentTarget) onClose()
        }}
        role="presentation"
      >
        <div
          {...props}
          aria-labelledby={titleId}
          aria-modal="true"
          className={['ods-drawer', className].filter(Boolean).join(' ')}
          data-placement={placement}
          data-size={size}
          data-slot="drawer"
          ref={mergeRefs(dialogRef, ref)}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>,
    document.body,
  )
})

const DrawerHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DrawerHeader({ children, className, ...props }, ref) {
    const { titleId } = useDrawerContext()
    return (
      <header
        {...props}
        className={['ods-drawer__header', className].filter(Boolean).join(' ')}
        data-slot="header"
        ref={ref}
      >
        <h2 className="ods-drawer__title" id={titleId}>
          {children}
        </h2>
      </header>
    )
  },
)

const DrawerBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DrawerBody(
  { className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-drawer__body', className].filter(Boolean).join(' ')}
      data-slot="body"
      ref={ref}
    />
  )
})

const DrawerFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DrawerFooter({ className, ...props }, ref) {
    return (
      <div
        {...props}
        className={['ods-drawer__footer', className].filter(Boolean).join(' ')}
        data-slot="footer"
        ref={ref}
      />
    )
  },
)

export interface DrawerCloseProps extends HTMLAttributes<HTMLButtonElement> {
  label?: string
}

const DrawerClose = forwardRef<HTMLButtonElement, DrawerCloseProps>(function DrawerClose(
  { className, label = '关闭', ...props },
  ref,
) {
  const { onClose } = useDrawerContext()
  return (
    <button
      {...props}
      aria-label={label}
      className={['ods-drawer__close', className].filter(Boolean).join(' ')}
      data-slot="close"
      onClick={onClose}
      ref={ref}
      type="button"
    >
      <span aria-hidden="true">✕</span>
    </button>
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Drawer = {
  Body: DrawerBody,
  Close: DrawerClose,
  Footer: DrawerFooter,
  Header: DrawerHeader,
  Root: DrawerRoot,
}
