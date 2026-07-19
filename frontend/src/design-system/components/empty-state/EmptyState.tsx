import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export interface EmptyStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  action?: ReactNode
  description?: ReactNode
  headingLevel?: 2 | 3 | 4
  icon?: ReactNode
  size?: 'lg' | 'md' | 'sm'
  title: ReactNode
}

const defaultIcon = <i className="ri-inbox-2-line" />

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    action,
    className,
    description,
    headingLevel = 3,
    icon = defaultIcon,
    size = 'md',
    title,
    ...props
  },
  ref,
) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <div
      {...props}
      className={['ods-empty-state', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="empty-state"
      ref={ref}
    >
      {icon ? (
        <span aria-hidden="true" className="ods-empty-state__icon" data-slot="icon">
          {icon}
        </span>
      ) : null}
      <Heading className="ods-empty-state__title" data-slot="title">
        {title}
      </Heading>
      {description ? (
        <div className="ods-empty-state__description" data-slot="description">
          {description}
        </div>
      ) : null}
      {action ? (
        <div className="ods-empty-state__action" data-slot="action">
          {action}
        </div>
      ) : null}
    </div>
  )
})
