import { forwardRef, type MouseEventHandler, type ReactNode } from 'react'
import { Link as ReactRouterLink, type LinkProps as ReactRouterLinkProps } from 'react-router-dom'
import type { ButtonSize, ButtonVariant } from '../../components/button'
import type { LinkTone, LinkUnderline } from '../../components/link'

export interface RouterButtonProps extends Omit<ReactRouterLinkProps, 'className'> {
  className?: string
  disabled?: boolean
  fullWidth?: boolean
  pending?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

export const RouterButton = forwardRef<HTMLAnchorElement, RouterButtonProps>(function RouterButton(
  {
    'aria-busy': ariaBusy,
    children,
    className,
    disabled = false,
    fullWidth = false,
    onClick,
    pending = false,
    size = 'md',
    tabIndex,
    variant = 'primary',
    ...props
  },
  ref,
) {
  const inactive = disabled || pending
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (inactive) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  return (
    <ReactRouterLink
      {...props}
      aria-busy={pending || ariaBusy || undefined}
      aria-disabled={inactive || undefined}
      className={['ods-button', 'ods-router-button', className].filter(Boolean).join(' ')}
      data-full-width={fullWidth || undefined}
      data-pending={pending || undefined}
      data-size={size}
      data-variant={variant}
      onClick={handleClick}
      ref={ref}
      tabIndex={inactive ? -1 : tabIndex}
    >
      {children}
    </ReactRouterLink>
  )
})

export interface RouterLinkProps extends Omit<ReactRouterLinkProps, 'className'> {
  className?: string
  icon?: ReactNode
  tone?: LinkTone
  underline?: LinkUnderline
}

export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(function RouterLink(
  { children, className, icon, tone = 'accent', underline = 'hover', ...props },
  ref,
) {
  return (
    <ReactRouterLink
      {...props}
      className={['ods-link', 'ods-router-link', className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-underline={underline}
      ref={ref}
    >
      {children}
      {icon ? (
        <span aria-hidden="true" className="ods-link__icon" data-slot="icon">
          {icon}
        </span>
      ) : null}
    </ReactRouterLink>
  )
})
