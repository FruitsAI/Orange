import { useToastStore, type ToastType } from '@/composables/useToast'

const iconByType: Record<ToastType, string> = {
  success: 'ri-checkbox-circle-fill',
  error: 'ri-close-circle-fill',
  warning: 'ri-error-warning-fill',
  info: 'ri-information-fill',
}

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const remove = useToastStore((state) => state.remove)

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          className={`toast-item ${toast.type}`}
          key={toast.id}
          onClick={() => remove(toast.id)}
          type="button"
        >
          <span className="icon">
            <i className={iconByType[toast.type]} />
          </span>
          <span className="message">{toast.message}</span>
        </button>
      ))}
    </div>
  )
}
