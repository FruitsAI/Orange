import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type BadgeTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
export type BadgePlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
export type BadgeShape = 'circle' | 'pill'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  content?: ReactNode
  dot?: boolean
  invisible?: boolean
  placement?: BadgePlacement
  shape?: BadgeShape
  tone?: BadgeTone
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    children,
    className,
    content,
    dot = false,
    invisible = false,
    placement = 'top-right',
    shape = 'pill',
    tone = 'accent',
    ...props
  },
  ref,
) {
  return (
    <span
      {...props}
      className={['ods-badge', className].filter(Boolean).join(' ')}
      data-slot="badge"
      ref={ref}
    >
      {children}
      <span
        aria-hidden={invisible || undefined}
        className="ods-badge__mark"
        data-dot={dot || undefined}
        data-invisible={invisible || undefined}
        data-placement={placement}
        data-shape={shape}
        data-slot="mark"
        data-tone={tone}
      >
        {dot ? null : content}
      </span>
    </span>
  )
})
