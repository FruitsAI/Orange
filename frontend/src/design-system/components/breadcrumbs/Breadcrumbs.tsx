import {
  forwardRef,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  children: ReactNode
  separator?: string
}

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  { 'aria-label': ariaLabel = '面包屑', children, className, separator = '/', style, ...props },
  ref,
) {
  const navStyle = { ...style, '--breadcrumb-separator': `'${separator}'` } as CSSProperties

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={['ods-breadcrumbs', className].filter(Boolean).join(' ')}
      data-slot="breadcrumbs"
      ref={ref}
      style={navStyle}
    >
      <ol className="ods-breadcrumbs__list" data-slot="list">
        {children}
      </ol>
    </nav>
  )
})

export interface BreadcrumbItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  current?: boolean
}

export const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  function BreadcrumbItem({ children, className, current = false, href, ...props }, ref) {
    return (
      <li
        className={['ods-breadcrumbs__item', className].filter(Boolean).join(' ')}
        data-slot="item"
        ref={ref}
      >
        {current || !href ? (
          <span
            aria-current={current ? 'page' : undefined}
            className="ods-breadcrumbs__link"
            data-current={current || undefined}
          >
            {children}
          </span>
        ) : (
          <a {...props} className="ods-breadcrumbs__link" href={href}>
            {children}
          </a>
        )}
      </li>
    )
  },
)
