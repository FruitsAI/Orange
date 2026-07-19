import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type ChangeEventHandler,
  type FieldsetHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

interface RadioGroupContextValue {
  disabled: boolean
  name: string
  onValueChange: (value: string) => void
  required: boolean
  value: string
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

const useRadioGroupContext = () => {
  const context = useContext(RadioGroupContext)
  if (!context) throw new Error('Radio must be used inside RadioGroup')
  return context
}

export interface RadioGroupProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange'
> {
  columns?: 1 | 2 | 3
  name?: string
  onValueChange: (value: string) => void
  required?: boolean
  value: string
}

const RadioGroupRoot = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroupRoot(
  {
    children,
    className,
    columns = 1,
    disabled = false,
    name,
    onValueChange,
    required = false,
    value,
    ...props
  },
  ref,
) {
  const generatedName = useId().replaceAll(':', '')
  const context = useMemo(
    () => ({
      disabled,
      name: name ?? `ods-radio-group-${generatedName}`,
      onValueChange,
      required,
      value,
    }),
    [disabled, generatedName, name, onValueChange, required, value],
  )

  return (
    <RadioGroupContext.Provider value={context}>
      <fieldset
        {...props}
        className={['ods-radio-group', className].filter(Boolean).join(' ')}
        data-columns={columns}
        data-slot="root"
        disabled={disabled}
        ref={ref}
      >
        {children}
      </fieldset>
    </RadioGroupContext.Provider>
  )
})

export type RadioGroupLegendProps = HTMLAttributes<HTMLLegendElement>

const RadioGroupLegend = forwardRef<HTMLLegendElement, RadioGroupLegendProps>(
  function RadioGroupLegend({ className, ...props }, ref) {
    return (
      <legend
        {...props}
        className={['ods-radio-group__legend', className].filter(Boolean).join(' ')}
        data-slot="legend"
        ref={ref}
      />
    )
  },
)

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'checked' | 'children' | 'name' | 'type' | 'value'
> {
  children?: ReactNode
  value: string
  variant?: 'card' | 'default'
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { children, className, disabled, onChange, value, variant = 'default', ...props },
  ref,
) {
  const group = useRadioGroupContext()
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event)
    if (!event.defaultPrevented) group.onValueChange(value)
  }

  return (
    <label
      className={['ods-radio', className].filter(Boolean).join(' ')}
      data-disabled={group.disabled || disabled || undefined}
      data-selected={group.value === value || undefined}
      data-slot="radio"
      data-variant={variant}
    >
      <input
        {...props}
        checked={group.value === value}
        className="ods-radio__input"
        disabled={disabled}
        name={group.name}
        onChange={handleChange}
        ref={ref}
        required={group.required || props.required}
        type="radio"
        value={value}
      />
      <span aria-hidden="true" className="ods-radio__control" data-slot="control">
        <span className="ods-radio__indicator" />
      </span>
      {children ? (
        <span className="ods-radio__label" data-slot="label">
          {children}
        </span>
      ) : null}
    </label>
  )
})

// The callable compound export intentionally supports both <RadioGroup> and RadioGroup.Legend.
// eslint-disable-next-line react-refresh/only-export-components
export const RadioGroup = Object.assign(RadioGroupRoot, { Legend: RadioGroupLegend })
