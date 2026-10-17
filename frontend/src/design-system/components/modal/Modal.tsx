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
import { OverlayLayerProvider } from '@/hooks/overlayStack'

export type ModalSize = 'sm' | 'md' | 'lg' | 'full'
export type ModalPlacement = 'center' | 'top'

interface ModalContextValue {
  onClose: () => void
  titleId: string
}

const ModalContext = createContext<ModalContextValue | null>(null)

const useModalContext = () => {
  const context = useContext(ModalContext)
  if (!context) throw new Error('Modal subcomponents must be used inside Modal.Root')
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

export interface ModalRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  dismissable?: boolean
  onClose: () => void
  open: boolean
  placement?: ModalPlacement
  size?: ModalSize
}

export const ModalRoot = forwardRef<HTMLDivElement, ModalRootProps>(function ModalRoot(
  {
    children,
    className,
    dismissable = true,
    onClose,
    open,
    placement = 'center',
    role = 'dialog',
    size = 'md',
    ...props
  },
  ref,
) {
  const titleId = useId().replaceAll(':', '')
  const dialogRef = useRef<HTMLDivElement>(null)
  const scrimPressStartedRef = useRef(false)
  const { overlayToken, zIndex } = useDialogFocus({
    closeOnEscape: dismissable,
    dialogRef,
    onClose,
    open,
  })

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <OverlayLayerProvider value={overlayToken}>
      <ModalContext.Provider value={{ onClose, titleId }}>
        <div
          className="ods-modal__scrim"
          data-placement={placement}
          data-slot="scrim"
          onPointerCancel={() => {
            scrimPressStartedRef.current = false
          }}
          onPointerDown={(event) => {
            scrimPressStartedRef.current = event.target === event.currentTarget
          }}
          onPointerUp={(event) => {
            const shouldDismiss =
              dismissable && scrimPressStartedRef.current && event.target === event.currentTarget
            scrimPressStartedRef.current = false
            if (shouldDismiss) onClose()
          }}
          role="presentation"
          style={{ zIndex }}
        >
          <div
            {...props}
            aria-labelledby={titleId}
            aria-modal="true"
            className={['ods-modal', className].filter(Boolean).join(' ')}
            data-size={size}
            data-slot="modal"
            ref={mergeRefs(dialogRef, ref)}
            role={role}
            tabIndex={-1}
          >
            {children}
          </div>
        </div>
      </ModalContext.Provider>
    </OverlayLayerProvider>,
    document.body,
  )
})

export const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ModalHeader({ children, className, ...props }, ref) {
    const { titleId } = useModalContext()
    return (
      <header
        {...props}
        className={['ods-modal__header', className].filter(Boolean).join(' ')}
        data-slot="header"
        ref={ref}
      >
        <h2 className="ods-modal__title" id={titleId}>
          {children}
        </h2>
      </header>
    )
  },
)

export const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ModalBody({ className, ...props }, ref) {
    return (
      <div
        {...props}
        className={['ods-modal__body', className].filter(Boolean).join(' ')}
        data-slot="body"
        ref={ref}
      />
    )
  },
)

export const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ModalFooter({ className, ...props }, ref) {
    return (
      <div
        {...props}
        className={['ods-modal__footer', className].filter(Boolean).join(' ')}
        data-slot="footer"
        ref={ref}
      />
    )
  },
)

export interface ModalCloseProps extends HTMLAttributes<HTMLButtonElement> {
  label?: string
}

export const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(function ModalClose(
  { className, label = '关闭', onClick, ...props },
  ref,
) {
  const { onClose } = useModalContext()
  return (
    <button
      {...props}
      aria-label={label}
      className={['ods-modal__close', className].filter(Boolean).join(' ')}
      data-slot="close"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onClose()
      }}
      ref={ref}
      type="button"
    >
      <span aria-hidden="true">✕</span>
    </button>
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Modal = {
  Body: ModalBody,
  Close: ModalClose,
  Footer: ModalFooter,
  Header: ModalHeader,
  Root: ModalRoot,
}
