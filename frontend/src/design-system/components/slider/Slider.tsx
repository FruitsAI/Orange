import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export type SliderSize = 'sm' | 'md' | 'lg'

export interface SliderProps {
  'aria-label'?: string
  className?: string
  disabled?: boolean
  label?: ReactNode
  max?: number
  min?: number
  onValueChange: (value: number) => void
  showValue?: boolean
  size?: SliderSize
  step?: number
  value: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const quantize = (value: number, min: number, step: number) => {
  const steps = Math.round((value - min) / step)
  return min + steps * step
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  {
    'aria-label': ariaLabel,
    className,
    disabled = false,
    label,
    max = 100,
    min = 0,
    onValueChange,
    showValue = false,
    size = 'md',
    step = 1,
    value,
    ...props
  },
  ref,
) {
  const trackRef = useRef<HTMLDivElement>(null)
  const labelId = useId().replaceAll(':', '')
  const fraction = max > min ? clamp((value - min) / (max - min), 0, 1) : 0

  // 1:1 tracking: map pointer x to the track, quantize to step (apple-design §2).
  const valueFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return value
      const rect = track.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      const raw = min + ratio * (max - min)
      return clamp(quantize(raw, min, step), min, max)
    },
    [max, min, step, value],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    // Capture so tracking continues past the element bounds (apple-design §2).
    event.currentTarget.setPointerCapture(event.pointerId)
    onValueChange(valueFromPointer(event.clientX))
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    // Continuous 1:1 feedback during the drag, not just at release (apple-design §1).
    onValueChange(valueFromPointer(event.clientX))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const deltas: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -step * 10,
      PageUp: step * 10,
    }
    if (event.key in deltas) {
      event.preventDefault()
      onValueChange(clamp(quantize(value + deltas[event.key], min, step), min, max))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onValueChange(min)
    } else if (event.key === 'End') {
      event.preventDefault()
      onValueChange(max)
    }
  }

  return (
    <div
      {...props}
      className={['ods-slider', className].filter(Boolean).join(' ')}
      data-disabled={disabled || undefined}
      data-size={size}
      data-slot="slider"
      ref={ref}
    >
      {label || showValue ? (
        <div className="ods-slider__header">
          {label ? (
            <span className="ods-slider__label" id={labelId}>
              {label}
            </span>
          ) : null}
          {showValue ? (
            <span className="ods-slider__value" data-slot="value">
              {value}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className="ods-slider__control"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={trackRef}
      >
        <div className="ods-slider__track" data-slot="track">
          <div
            className="ods-slider__fill"
            data-slot="fill"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
        <div
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? labelId : undefined}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={value}
          aria-disabled={disabled || undefined}
          className="ods-slider__thumb"
          data-slot="thumb"
          onKeyDown={handleKeyDown}
          role="slider"
          style={{ left: `${fraction * 100}%` }}
          tabIndex={disabled ? -1 : 0}
        />
      </div>
    </div>
  )
})
