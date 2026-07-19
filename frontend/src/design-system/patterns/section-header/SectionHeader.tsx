import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { SurfaceTone } from '../../components/surface'

export type SectionHeaderDensity = 'compact' | 'default'
export type SectionHeaderSize = 'md' | 'lg'

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  actions?: ReactNode
  density?: SectionHeaderDensity
  description?: ReactNode
  headingLevel?: 2 | 3 | 4
  icon?: ReactNode
  iconTone?: SurfaceTone
  size?: SectionHeaderSize
  title: ReactNode
}

export const SectionHeader = forwardRef<HTMLElement, SectionHeaderProps>(function SectionHeader(
  {
    actions,
    className,
    density = 'default',
    description,
    headingLevel = 2,
    icon,
    iconTone = 'accent',
    size = 'md',
    title,
    ...props
  },
  ref,
) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <header
      {...props}
      className={['ods-section-header', className].filter(Boolean).join(' ')}
      data-density={density}
      data-size={size}
      data-slot="section-header"
      ref={ref}
    >
      <div className="ods-section-header__content" data-slot="content">
        {icon ? (
          <span
            aria-hidden="true"
            className="ods-section-header__icon"
            data-slot="icon"
            data-tone={iconTone}
          >
            {icon}
          </span>
        ) : null}
        <div className="ods-section-header__copy" data-slot="copy">
          <Heading className="ods-section-header__title" data-slot="title">
            {title}
          </Heading>
          {description ? (
            <div className="ods-section-header__description" data-slot="description">
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="ods-section-header__actions" data-slot="actions">
          {actions}
        </div>
      ) : null}
    </header>
  )
})
