import { forwardRef, type HTMLAttributes } from 'react'

export type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type ChipVariant = 'soft' | 'solid' | 'outline'
export type ChipSize = 'sm' | 'md' | 'lg'

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  size?: ChipSize
  tone?: ChipTone
  variant?: ChipVariant
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  { className, size = 'md', tone = 'neutral', variant = 'soft', ...props },
  ref,
) {
  return (
    <span
      {...props}
      className={['ods-chip', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="chip"
      data-tone={tone}
      data-variant={variant}
      ref={ref}
    />
  )
})
