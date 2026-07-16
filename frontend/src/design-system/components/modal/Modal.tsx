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

const ModalRoot = forwardRef<HTMLDivElement, ModalRootProps>(function ModalRoot(
  {
    children,
    className,
    dismissable = true,
    onClose,
    open,
    placement = 'center',
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
    <ModalContext.Provider value={{ onClose, titleId }}>
      <div
        className="ods-modal__scrim"
        data-placement={placement}
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
          className={['ods-modal', className].filter(Boolean).join(' ')}
          data-size={size}
          data-slot="modal"
          ref={mergeRefs(dialogRef, ref)}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  )
})

const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function ModalHeader(
  { children, className, ...props },
  ref,
) {
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
})

const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function ModalBody(
  { className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-modal__body', className].filter(Boolean).join(' ')}
      data-slot="body"
      ref={ref}
    />
  )
})

const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function ModalFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-modal__footer', className].filter(Boolean).join(' ')}
      data-slot="footer"
      ref={ref}
    />
  )
})

export interface ModalCloseProps extends HTMLAttributes<HTMLButtonElement> {
  label?: string
}

const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(function ModalClose(
  { className, label = '关闭', ...props },
  ref,
) {
  const { onClose } = useModalContext()
  return (
    <button
      {...props}
      aria-label={label}
      className={['ods-modal__close', className].filter(Boolean).join(' ')}
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
export const Modal = {
  Body: ModalBody,
  Close: ModalClose,
  Footer: ModalFooter,
  Header: ModalHeader,
  Root: ModalRoot,
}
