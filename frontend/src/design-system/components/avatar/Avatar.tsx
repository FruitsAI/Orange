import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react'

export type AvatarSize = 'sm' | 'md' | 'lg'
export type AvatarRadius = 'full' | 'lg' | 'md'
export type AvatarTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  alt?: string
  bordered?: boolean
  fallback?: ReactNode
  imgProps?: ImgHTMLAttributes<HTMLImageElement>
  name?: string
  radius?: AvatarRadius
  size?: AvatarSize
  src?: string
  tone?: AvatarTone
}

const initials = (name?: string) => {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    alt,
    bordered = false,
    className,
    fallback,
    imgProps,
    name,
    radius = 'full',
    size = 'md',
    src,
    tone = 'neutral',
    ...props
  },
  ref,
) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  return (
    <span
      {...props}
      className={['ods-avatar', className].filter(Boolean).join(' ')}
      data-bordered={bordered || undefined}
      data-radius={radius}
      data-size={size}
      data-slot="avatar"
      data-tone={tone}
      ref={ref}
    >
      {showImage ? (
        <img
          {...imgProps}
          alt={alt ?? name ?? ''}
          className="ods-avatar__image"
          data-slot="image"
          onError={() => setFailed(true)}
          src={src}
        />
      ) : (
        <span
          aria-hidden={!name || undefined}
          className="ods-avatar__fallback"
          data-slot="fallback"
        >
          {fallback ?? initials(name)}
        </span>
      )}
    </span>
  )
})

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number
  total?: number
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { children, className, max, total, ...props },
  ref,
) {
  const items = Array.isArray(children) ? children : [children]
  const visible = max === undefined ? items : items.slice(0, max)
  const overflow = (total ?? items.length) - visible.length

  return (
    <div
      {...props}
      className={['ods-avatar-group', className].filter(Boolean).join(' ')}
      data-slot="avatar-group"
      ref={ref}
      role="group"
    >
      {visible}
      {overflow > 0 ? (
        <span
          className="ods-avatar ods-avatar__count"
          data-radius="full"
          data-size="md"
          data-slot="count"
        >
          <span className="ods-avatar__fallback">+{overflow}</span>
        </span>
      ) : null}
    </div>
  )
})
