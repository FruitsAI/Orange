import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { dismissToast, getToasts, subscribeToasts, type ToastTone } from './toastStore'

const ICON_BY_TONE: Record<ToastTone, string> = {
  success: 'ri-checkbox-circle-fill',
  error: 'ri-close-circle-fill',
  warning: 'ri-error-warning-fill',
  info: 'ri-information-fill',
}

export interface ToasterProps {
  dismissLabel?: string
}

export function Toaster({ dismissLabel = '点击关闭' }: ToasterProps) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div aria-live="polite" className="ods-toaster" data-slot="toaster" role="status">
      {toasts.map((item) => (
        <button
          aria-label={`${item.message}（${dismissLabel}）`}
          className="ods-toast"
          data-slot="toast"
          data-tone={item.tone}
          key={item.id}
          onClick={() => dismissToast(item.id)}
          type="button"
        >
          <span aria-hidden="true" className="ods-toast__icon" data-slot="icon">
            <i className={ICON_BY_TONE[item.tone]} />
          </span>
          <span className="ods-toast__message" data-slot="message">
            {item.message}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
