import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { Checkbox } from '../checkbox'

type Orientation = 'vertical' | 'horizontal'

interface CheckboxGroupContextValue {
  disabled: boolean
  name: string
  onToggle: (value: string, checked: boolean) => void
  value: string[]
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null)

const useCheckboxGroupContext = () => {
  const context = useContext(CheckboxGroupContext)
  if (!context) throw new Error('CheckboxGroup.Item must be used inside CheckboxGroup')
  return context
}

export interface CheckboxGroupProps extends Omit<HTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  disabled?: boolean
  label?: ReactNode
  name?: string
  onValueChange: (value: string[]) => void
  orientation?: Orientation
  value: string[]
}

export const CheckboxGroupRoot = forwardRef<HTMLFieldSetElement, CheckboxGroupProps>(
  function CheckboxGroupRoot(
    {
      children,
      className,
      disabled = false,
      label,
      name,
      onValueChange,
      orientation = 'vertical',
      value,
      ...props
    },
    ref,
  ) {
    const generatedName = useId().replaceAll(':', '')

    const context = useMemo<CheckboxGroupContextValue>(
      () => ({
        disabled,
        name: name ?? `ods-checkbox-group-${generatedName}`,
        onToggle: (itemValue, checked) => {
          onValueChange(
            checked ? [...value, itemValue] : value.filter((entry) => entry !== itemValue),
          )
        },
        value,
      }),
      [disabled, generatedName, name, onValueChange, value],
    )

    return (
      <CheckboxGroupContext.Provider value={context}>
        <fieldset
          {...props}
          className={['ods-checkbox-group', className].filter(Boolean).join(' ')}
          data-orientation={orientation}
          data-slot="checkbox-group"
          ref={ref}
        >
          {label ? (
            <legend className="ods-checkbox-group__legend" data-slot="legend">
              {label}
            </legend>
          ) : null}
          <div className="ods-checkbox-group__items" data-slot="items">
            {children}
          </div>
        </fieldset>
      </CheckboxGroupContext.Provider>
    )
  },
)

export interface CheckboxGroupItemProps {
  children?: ReactNode
  disabled?: boolean
  value: string
}

export function CheckboxGroupItem({ children, disabled = false, value }: CheckboxGroupItemProps) {
  const context = useCheckboxGroupContext()
  return (
    <Checkbox
      checked={context.value.includes(value)}
      disabled={disabled || context.disabled}
      name={context.name}
      onChange={(event) => context.onToggle(value, event.target.checked)}
      value={value}
    >
      {children}
    </Checkbox>
  )
}

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const CheckboxGroup = Object.assign(CheckboxGroupRoot, { Item: CheckboxGroupItem })
