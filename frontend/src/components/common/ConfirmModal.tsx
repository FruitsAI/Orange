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
  if (!open) return null

  return (
    <div className="confirm-overlay" onClick={onCancel} role="presentation">
      <div
        aria-modal="true"
        className="confirm-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel} type="button">
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
