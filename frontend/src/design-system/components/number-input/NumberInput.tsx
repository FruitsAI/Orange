import { forwardRef, useCallback, type InputHTMLAttributes } from 'react'
import { useFieldControlProps } from '../field/fieldContext'

export type NumberInputSize = 'sm' | 'md' | 'lg'

export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'onChange' | 'value'
> {
  decrementLabel?: string
  incrementLabel?: string
  onValueChange?: (value: number) => void
  size?: NumberInputSize
  step?: number
  value?: number
}

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    className,
    decrementLabel = '减少',
    disabled,
    incrementLabel = '增加',
    max,
    min,
    onValueChange,
    size = 'md',
    step = 1,
    value,
    ...props
  },
  ref,
) {
  const controlProps = useFieldControlProps({ disabled, ...props })
  const numericMax = max === undefined ? undefined : toNumber(max)
  const numericMin = min === undefined ? undefined : toNumber(min)

  const clamp = useCallback(
    (next: number) => {
      let result = next
      if (numericMax !== undefined) result = Math.min(numericMax, result)
      if (numericMin !== undefined) result = Math.max(numericMin, result)
      return result
    },
    [numericMax, numericMin],
  )

  const shift = (direction: 1 | -1) => {
    const base = value === undefined ? 0 : value
    onValueChange?.(clamp(base + direction * step))
  }

  return (
    <div
      className={['ods-number-input', className].filter(Boolean).join(' ')}
      data-disabled={disabled || undefined}
      data-size={size}
      data-slot="number-input"
    >
      <button
        aria-label={decrementLabel}
        className="ods-number-input__button"
        data-slot="decrement"
        disabled={
          disabled || (numericMin !== undefined && value !== undefined && value <= numericMin)
        }
        onClick={() => shift(-1)}
        tabIndex={-1}
        type="button"
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        {...controlProps}
        className="ods-number-input__field"
        data-slot="field"
        inputMode="decimal"
        max={max}
        min={min}
        onChange={(event) => onValueChange?.(clamp(toNumber(event.target.value)))}
        ref={ref}
        step={step}
        type="number"
        value={value ?? ''}
      />
      <button
        aria-label={incrementLabel}
        className="ods-number-input__button"
        data-slot="increment"
        disabled={
          disabled || (numericMax !== undefined && value !== undefined && value >= numericMax)
        }
        onClick={() => shift(1)}
        tabIndex={-1}
        type="button"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
})
