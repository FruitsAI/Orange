import { forwardRef, useMemo, useState, type ReactNode } from 'react'
import { useFieldControlProps } from '../field/fieldContext'
import { Popover, usePopoverClose } from '../popover'
import { Listbox } from '../listbox'

export type SelectSize = 'sm' | 'md' | 'lg'
export type SelectWidth = 'content' | 'default'

const SELECT_INITIAL_FOCUS = [
  '[role="option"][aria-selected="true"]:not([aria-disabled="true"])',
  '[role="option"][tabindex="0"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])',
]

export interface SelectOption {
  description?: ReactNode
  disabled?: boolean
  label: ReactNode
  value: string
}

interface SelectOptionsProps {
  ariaLabel?: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  value?: string
}

function SelectOptions({ ariaLabel, onValueChange, options, value }: SelectOptionsProps) {
  const close = usePopoverClose()

  return (
    <Listbox
      aria-label={ariaLabel}
      onSelect={(next) => {
        onValueChange(next)
        close()
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
  )
}

export interface SelectProps {
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  size?: SelectSize
  value?: string
  width?: SelectWidth
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    className,
    disabled = false,
    invalid = false,
    id,
    onValueChange,
    options,
    placeholder = '请选择',
    required = false,
    size = 'md',
    value,
    width = 'default',
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value])
  const controlProps = useFieldControlProps({
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': invalid,
    disabled,
    id,
    required,
  })

  return (
    <Popover.Root className={className} onOpenChange={setOpen} open={open} placement="bottom-start">
      <Popover.Trigger>
        <button
          aria-label={ariaLabel}
          aria-describedby={controlProps['aria-describedby']}
          aria-haspopup="listbox"
          aria-invalid={controlProps['aria-invalid']}
          aria-required={controlProps.required || undefined}
          className="ods-select"
          data-invalid={controlProps['aria-invalid'] || undefined}
          data-size={size}
          data-slot="select"
          data-width={width}
          disabled={controlProps.disabled}
          id={controlProps.id}
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
      <Popover.Content
        className="ods-select__popover"
        data-width={width}
        initialFocus={SELECT_INITIAL_FOCUS}
        role="presentation"
      >
        <SelectOptions
          ariaLabel={ariaLabel}
          onValueChange={onValueChange}
          options={options}
          value={value}
        />
      </Popover.Content>
    </Popover.Root>
  )
})
