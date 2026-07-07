import type { HTMLAttributes, ReactNode } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean
  hover?: boolean
  noPadding?: boolean
  header?: ReactNode
}

export default function GlassCard({
  flat = false,
  hover = false,
  noPadding = false,
  header,
  className = '',
  children,
  ...props
}: GlassCardProps) {
  const classes = [
    'glass-card',
    flat ? 'glass-card--flat' : '',
    hover ? 'glass-card--hover' : '',
    noPadding ? 'p-0' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {header}
      {children}
    </div>
  )
}
