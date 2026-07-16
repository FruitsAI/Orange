import { forwardRef, useMemo, useState, type ReactNode } from 'react'
import { Popover } from '../popover'
import { Listbox } from '../listbox'

export type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectOption {
  description?: ReactNode
  disabled?: boolean
  label: ReactNode
  value: string
}

export interface SelectProps {
  'aria-label'?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  size?: SelectSize
  value?: string
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    'aria-label': ariaLabel,
    className,
    disabled = false,
    invalid = false,
    onValueChange,
    options,
    placeholder = '请选择',
    size = 'md',
    value,
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value])

  return (
    <Popover.Root className={className} onOpenChange={setOpen} open={open} placement="bottom-start">
      <Popover.Trigger>
        <button
          aria-label={ariaLabel}
          className="ods-select"
          data-invalid={invalid || undefined}
          data-size={size}
          data-slot="select"
          disabled={disabled}
          ref={ref}
          type="button"
        >
          <span className="ods-select__value" data-placeholder={selected ? undefined : ''}>
            {selected ? selected.label : placeholder}
          </span>
          <span aria-hidden="true" className="ods-select__caret" data-open={open || undefined}>
            <i className="ri-arrow-down-s-line" />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Content className="ods-select__popover" role="listbox">
        <Listbox
          onSelect={(next) => {
            onValueChange(next)
            setOpen(false)
          }}
          selectedValues={value ? [value] : []}
        >
          {options.map((option) => (
            <Listbox.Item
              description={option.description}
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </Listbox.Item>
          ))}
        </Listbox>
      </Popover.Content>
    </Popover.Root>
  )
})
