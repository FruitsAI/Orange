import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type AlertTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  action?: ReactNode
  dismissLabel?: string
  icon?: ReactNode
  onDismiss?: () => void
  title: ReactNode
  tone?: AlertTone
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    action,
    children,
    className,
    dismissLabel = '关闭提示',
    icon,
    onDismiss,
    role,
    title,
    tone = 'neutral',
    ...props
  },
  ref,
) {
  const effectiveRole = role ?? (tone === 'danger' ? 'alert' : 'status')

  return (
    <div
      {...props}
      className={['ods-alert', className].filter(Boolean).join(' ')}
      data-slot="alert"
      data-tone={tone}
      ref={ref}
      role={effectiveRole}
    >
      {icon ? (
        <span aria-hidden="true" className="ods-alert__icon" data-slot="icon">
          {icon}
        </span>
      ) : null}
      <div className="ods-alert__copy" data-slot="copy">
        <h3 className="ods-alert__title" data-slot="title">
          {title}
        </h3>
        {children ? (
          <div className="ods-alert__description" data-slot="description">
            {children}
          </div>
        ) : null}
      </div>
      {action ? (
        <div className="ods-alert__action" data-slot="action">
          {action}
        </div>
      ) : null}
      {onDismiss ? (
        <button
          aria-label={dismissLabel}
          className="ods-alert__dismiss"
          data-slot="dismiss"
          onClick={onDismiss}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  )
})
