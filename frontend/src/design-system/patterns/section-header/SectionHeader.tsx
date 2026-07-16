import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  actions?: ReactNode
  description?: ReactNode
  headingLevel?: 2 | 3 | 4
  title: ReactNode
}

export const SectionHeader = forwardRef<HTMLElement, SectionHeaderProps>(function SectionHeader(
  { actions, className, description, headingLevel = 2, title, ...props },
  ref,
) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <header
      {...props}
      className={['ods-section-header', className].filter(Boolean).join(' ')}
      data-slot="section-header"
      ref={ref}
    >
      <div className="ods-section-header__content" data-slot="content">
        <Heading className="ods-section-header__title" data-slot="title">
          {title}
        </Heading>
        {description ? (
          <div className="ods-section-header__description" data-slot="description">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="ods-section-header__actions" data-slot="actions">
          {actions}
        </div>
      ) : null}
    </header>
  )
})
