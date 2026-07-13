import type { ComponentProps } from 'react'
import GlassCard from './GlassCard'

export type EmberPanelProps = Omit<ComponentProps<typeof GlassCard>, 'flat' | 'hover'>

export default function EmberPanel({ className = '', ...props }: EmberPanelProps) {
  return <GlassCard className={`ember-panel ${className}`.trim()} {...props} />
}
