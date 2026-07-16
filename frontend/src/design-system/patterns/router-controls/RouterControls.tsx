import { forwardRef, type MouseEventHandler, type ReactNode } from 'react'
import {
  Link as ReactRouterLink,
  NavLink as ReactRouterNavLink,
  type LinkProps as ReactRouterLinkProps,
  type NavLinkRenderProps,
  type NavLinkProps as ReactRouterNavLinkProps,
} from 'react-router-dom'
import type { ButtonSize, ButtonTone, ButtonVariant } from '../../components/button'
import type { LinkTone, LinkUnderline } from '../../components/link'

export interface RouterButtonProps extends Omit<ReactRouterLinkProps, 'className'> {
  className?: string
  disabled?: boolean
  fullWidth?: boolean
  pending?: boolean
  size?: ButtonSize
  tone?: ButtonTone
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
    tone = 'neutral',
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
      data-tone={tone}
      data-variant={variant}
      onClick={handleClick}
      ref={ref}
      tabIndex={inactive ? -1 : tabIndex}
    >
      {children}
    </ReactRouterLink>
  )
})

export interface RouterIconButtonProps extends Omit<RouterButtonProps, 'aria-label'> {
  label: string
}

export const RouterIconButton = forwardRef<HTMLAnchorElement, RouterIconButtonProps>(
  function RouterIconButton({ children, className, label, ...props }, ref) {
    return (
      <RouterButton
        {...props}
        aria-label={label}
        className={['ods-icon-button', className].filter(Boolean).join(' ')}
        ref={ref}
      >
        {children}
      </RouterButton>
    )
  },
)

export interface RouterLinkProps extends Omit<ReactRouterLinkProps, 'className'> {
  appearance?: 'link' | 'row'
  className?: string
  density?: 'compact' | 'comfortable'
  icon?: ReactNode
  tone?: LinkTone
  underline?: LinkUnderline
}

export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(function RouterLink(
  {
    appearance = 'link',
    children,
    className,
    density = 'compact',
    icon,
    tone,
    underline,
    ...props
  },
  ref,
) {
  const resolvedTone = tone ?? (appearance === 'row' ? 'foreground' : 'accent')
  const resolvedUnderline = underline ?? (appearance === 'row' ? 'none' : 'hover')

  return (
    <ReactRouterLink
      {...props}
      className={['ods-link', 'ods-router-link', className].filter(Boolean).join(' ')}
      data-appearance={appearance}
      data-density={density}
      data-tone={resolvedTone}
      data-underline={resolvedUnderline}
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

export interface RouterNavLinkProps extends Omit<ReactRouterNavLinkProps, 'className'> {
  appearance?: 'dock' | 'link' | 'tab'
  className?: ReactRouterNavLinkProps['className']
  icon?: ReactNode
  tone?: LinkTone
  underline?: LinkUnderline
}

const renderRouterNavLinkContent = (content: ReactNode, icon?: ReactNode) => (
  <>
    {icon ? (
      <span aria-hidden="true" className="ods-router-nav-link__icon" data-slot="icon">
        {icon}
      </span>
    ) : null}
    <span className="ods-router-nav-link__label" data-slot="label">
      {content}
    </span>
  </>
)

export const RouterNavLink = forwardRef<HTMLAnchorElement, RouterNavLinkProps>(
  function RouterNavLink(
    {
      appearance = 'link',
      children,
      className,
      icon,
      tone = 'foreground',
      underline = 'none',
      ...props
    },
    ref,
  ) {
    const baseClasses = ['ods-link', 'ods-router-link', 'ods-router-nav-link']
    const resolvedClassName: ReactRouterNavLinkProps['className'] =
      typeof className === 'function'
        ? (state) => [...baseClasses, className(state)].filter(Boolean).join(' ')
        : [...baseClasses, className].filter(Boolean).join(' ')
    const resolvedChildren: ReactRouterNavLinkProps['children'] =
      typeof children === 'function'
        ? (state: NavLinkRenderProps) => renderRouterNavLinkContent(children(state), icon)
        : renderRouterNavLinkContent(children, icon)

    return (
      <ReactRouterNavLink
        {...props}
        className={resolvedClassName}
        data-appearance={appearance}
        data-tone={tone}
        data-underline={underline}
        ref={ref}
      >
        {resolvedChildren}
      </ReactRouterNavLink>
    )
  },
)
