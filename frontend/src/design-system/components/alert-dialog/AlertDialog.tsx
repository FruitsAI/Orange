import { forwardRef, useId, type ReactNode } from 'react'
import { Button, type ButtonVariant } from '../button'
import { Modal, type ModalRootProps } from '../modal'

export interface AlertDialogProps extends Omit<ModalRootProps, 'children' | 'onClose' | 'title'> {
  action: ReactNode
  actionVariant?: ButtonVariant
  cancel?: ReactNode
  description?: ReactNode
  onAction: () => void
  onClose: () => void
  pending?: boolean
  title: ReactNode
}

export const AlertDialog = forwardRef<HTMLDivElement, AlertDialogProps>(function AlertDialog(
  {
    action,
    actionVariant = 'danger',
    cancel = '取消',
    description,
    dismissable = false,
    onAction,
    onClose,
    pending = false,
    size = 'sm',
    title,
    ...props
  },
  ref,
) {
  const descriptionId = useId().replaceAll(':', '')
  const closeWhenIdle = () => {
    if (!pending) onClose()
  }

  return (
    <Modal.Root
      {...props}
      aria-describedby={description ? descriptionId : undefined}
      dismissable={dismissable && !pending}
      onClose={closeWhenIdle}
      ref={ref}
      role="alertdialog"
      size={size}
    >
      <Modal.Header>{title}</Modal.Header>
      {description ? (
        <Modal.Body>
          <p className="ods-alert-dialog__description" id={descriptionId}>
            {description}
          </p>
        </Modal.Body>
      ) : null}
      <Modal.Footer>
        <Button disabled={pending} onClick={closeWhenIdle} variant="ghost">
          {cancel}
        </Button>
        <Button onClick={onAction} pending={pending} variant={actionVariant}>
          {action}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
})
