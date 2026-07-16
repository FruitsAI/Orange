import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react'

export type LinkUnderline = 'none' | 'hover' | 'always'
export type LinkTone = 'accent' | 'foreground' | 'muted' | 'danger'

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  external?: boolean
  icon?: ReactNode
  tone?: LinkTone
  underline?: LinkUnderline
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    children,
    className,
    external = false,
    icon,
    rel,
    target,
    tone = 'accent',
    underline = 'hover',
    ...props
  },
  ref,
) {
  const externalRel = external ? (rel ?? 'noopener noreferrer') : rel
  const externalTarget = external ? (target ?? '_blank') : target

  return (
    <a
      {...props}
      className={['ods-link', className].filter(Boolean).join(' ')}
      data-slot="link"
      data-tone={tone}
      data-underline={underline}
      ref={ref}
      rel={externalRel}
      target={externalTarget}
    >
      {children}
      {icon ? (
        <span aria-hidden="true" className="ods-link__icon" data-slot="icon">
          {icon}
        </span>
      ) : null}
    </a>
  )
})
