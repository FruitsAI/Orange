import { forwardRef, type HTMLAttributes } from 'react'

export type ProgressBarTone = 'accent' | 'success' | 'warning' | 'danger'
export type ProgressBarSize = 'sm' | 'md' | 'lg'

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-label'> {
  label: string
  max?: number
  min?: number
  size?: ProgressBarSize
  tone?: ProgressBarTone
  value?: number
  valueLabel?: string
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(function ProgressBar(
  {
    className,
    label,
    max = 100,
    min = 0,
    size = 'md',
    tone = 'accent',
    value,
    valueLabel,
    ...props
  },
  ref,
) {
  const safeMax = max > min ? max : min + 1
  const determinate = typeof value === 'number' && Number.isFinite(value)
  const clampedValue = determinate ? Math.min(safeMax, Math.max(min, value)) : undefined
  const percentage =
    clampedValue === undefined ? 0 : ((clampedValue - min) / (safeMax - min)) * 100

  return (
    <div
      {...props}
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={min}
      aria-valuenow={clampedValue}
      aria-valuetext={valueLabel}
      className={['ods-progress', className].filter(Boolean).join(' ')}
      data-indeterminate={!determinate || undefined}
      data-size={size}
      data-slot="progress"
      data-tone={tone}
      ref={ref}
      role="progressbar"
    >
      <span className="ods-progress__track" data-slot="track">
        <span
          className="ods-progress__fill"
          data-slot="fill"
          style={determinate ? { width: `${percentage}%` } : undefined}
        />
      </span>
    </div>
  )
})
