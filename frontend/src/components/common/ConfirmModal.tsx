import { useId, useRef } from 'react'
import { Button } from '@/design-system'
import { useDialogFocus } from '@/hooks/useDialogFocus'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmModal({
  open,
  title = '确认',
  message,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useDialogFocus({ dialogRef, initialFocusRef: cancelRef, onClose: onCancel, open })

  if (!open) return null

  return (
    <div
      className="confirm-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-modal"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h3 className="confirm-title" id={titleId}>
          {title}
        </h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <Button onClick={onCancel} ref={cancelRef} variant="ghost">
            取消
          </Button>
          <Button onClick={onConfirm} variant="primary">
            确认
          </Button>
        </div>
      </div>
    </div>
  )
}
