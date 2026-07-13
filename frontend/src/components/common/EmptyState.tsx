import type { HTMLAttributes, ReactNode } from 'react'

export interface EmptyStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  action?: ReactNode
  description?: ReactNode
  icon: ReactNode
  title: ReactNode
}

export default function EmptyState({
  action,
  className = '',
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()} {...props}>
      <span aria-hidden="true" className="empty-state__icon">
        {icon}
      </span>
      <strong className="empty-state__title">{title}</strong>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}
