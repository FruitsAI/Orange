import { useId, useRef } from 'react'
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
          <button className="btn btn-ghost" onClick={onCancel} ref={cancelRef} type="button">
            取消
          </button>
          <button className="btn btn-primary" onClick={onConfirm} type="button">
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
