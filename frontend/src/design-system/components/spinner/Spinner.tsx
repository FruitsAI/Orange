import { forwardRef, type HTMLAttributes } from 'react'

export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerTone = 'current' | 'accent' | 'success' | 'warning' | 'danger'

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  label?: string
  size?: SpinnerSize
  tone?: SpinnerTone
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { className, label = '加载中', size = 'md', tone = 'current', ...props },
  ref,
) {
  return (
    <span
      {...props}
      aria-label={label}
      className={['ods-spinner', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="spinner"
      data-tone={tone}
      ref={ref}
      role="status"
    >
      <span aria-hidden="true" className="ods-spinner__indicator" data-slot="indicator" />
    </span>
  )
})
