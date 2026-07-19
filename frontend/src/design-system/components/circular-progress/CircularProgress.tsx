import { forwardRef, type HTMLAttributes } from 'react'

export type CircularProgressSize = 'sm' | 'md' | 'lg'
export type CircularProgressTone = 'accent' | 'success' | 'warning' | 'danger'

export interface CircularProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-label'> {
  'aria-label'?: string
  indeterminate?: boolean
  max?: number
  min?: number
  showValueLabel?: boolean
  size?: CircularProgressSize
  tone?: CircularProgressTone
  value?: number
  valueLabel?: string
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const clampFraction = (value: number, min: number, max: number) => {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

export const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(
  function CircularProgress(
    {
      'aria-label': ariaLabel = '进度',
      className,
      indeterminate = false,
      max = 100,
      min = 0,
      showValueLabel = false,
      size = 'md',
      tone = 'accent',
      value = 0,
      valueLabel,
      ...props
    },
    ref,
  ) {
    const fraction = clampFraction(value, min, max)
    const percent = Math.round(fraction * 100)
    const dashOffset = indeterminate ? CIRCUMFERENCE * 0.7 : CIRCUMFERENCE * (1 - fraction)

    return (
      <div
        {...props}
        aria-label={ariaLabel}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuemin={indeterminate ? undefined : min}
        aria-valuenow={indeterminate ? undefined : value}
        className={['ods-circular-progress', className].filter(Boolean).join(' ')}
        data-indeterminate={indeterminate || undefined}
        data-size={size}
        data-slot="circular-progress"
        data-tone={tone}
        ref={ref}
        role="progressbar"
      >
        <svg className="ods-circular-progress__svg" data-slot="svg" viewBox="0 0 100 100">
          <circle className="ods-circular-progress__track" cx="50" cy="50" fill="none" r={RADIUS} />
          <circle
            className="ods-circular-progress__indicator"
            cx="50"
            cy="50"
            fill="none"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        {showValueLabel && !indeterminate ? (
          <span className="ods-circular-progress__label" data-slot="label">
            {valueLabel ?? `${percent}%`}
          </span>
        ) : null}
      </div>
    )
  },
)
