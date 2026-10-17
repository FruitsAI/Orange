import type { ComponentProps } from 'react'
import { Card } from '@/design-system'

export type EmberPanelProps = ComponentProps<typeof Card.Root>

export default function EmberPanel({
  className = '',
  gap = 'md',
  hoverable = true,
  variant = 'tertiary',
  ...props
}: EmberPanelProps) {
  return (
    <Card.Root
      className={`ember-panel ${className}`.trim()}
      gap={gap}
      hoverable={hoverable}
      variant={variant}
      {...props}
    />
  )
}
