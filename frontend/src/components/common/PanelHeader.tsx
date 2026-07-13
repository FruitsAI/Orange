import type { HTMLAttributes, ReactNode } from 'react'

export interface PanelHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  action?: ReactNode
  headingLevel?: 2 | 3
  subtitle?: ReactNode
  title: ReactNode
}

export default function PanelHeader({
  action,
  className = '',
  headingLevel = 3,
  subtitle,
  title,
  ...props
}: PanelHeaderProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <div className={`panel-header ${className}`.trim()} {...props}>
      <div className="panel-header__copy">
        <Heading className="panel-header__title">{title}</Heading>
        {subtitle ? <p className="panel-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="panel-header__action">{action}</div> : null}
    </div>
  )
}
