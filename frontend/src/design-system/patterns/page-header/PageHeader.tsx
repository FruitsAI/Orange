import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  actions?: ReactNode
  description?: ReactNode
  leading?: ReactNode
  title: ReactNode
}

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { actions, className, description, leading, title, ...props },
  ref,
) {
  return (
    <header
      {...props}
      className={['ods-page-header', className].filter(Boolean).join(' ')}
      data-slot="page-header"
      ref={ref}
    >
      {leading ? (
        <div className="ods-page-header__leading" data-slot="leading">
          {leading}
        </div>
      ) : null}
      <div className="ods-page-header__content" data-slot="content">
        <h1 className="ods-page-header__title" data-slot="title">
          {title}
        </h1>
        {description ? (
          <div className="ods-page-header__description" data-slot="description">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="ods-page-header__actions" data-slot="actions">
          {actions}
        </div>
      ) : null}
    </header>
  )
})
