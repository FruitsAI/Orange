import dayjs from 'dayjs'
import { forwardRef, useState } from 'react'
import { Popover, usePopoverClose } from '../popover'
import { Calendar } from '../calendar'
import { useFieldControlProps } from '../field/fieldContext'

export type DatePickerSize = 'sm' | 'md' | 'lg'

const DATE_PICKER_INITIAL_FOCUS = [
  '.ods-calendar__day[data-selected="true"]:not(:disabled)',
  '.ods-calendar__day[data-today="true"]:not(:disabled)',
  '.ods-calendar__day:not(:disabled)',
]

interface DatePickerCalendarProps {
  max?: string
  min?: string
  onValueChange: (value: string) => void
  value?: string
}

function DatePickerCalendar({ max, min, onValueChange, value }: DatePickerCalendarProps) {
  const close = usePopoverClose()

  return (
    <Calendar
      max={max}
      min={min}
      onValueChange={(next) => {
        onValueChange(next)
        close()
      }}
      value={value}
    />
  )
}

export interface DatePickerProps {
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
  disabled?: boolean
  displayFormat?: string
  invalid?: boolean
  id?: string
  max?: string
  min?: string
  onValueChange: (value: string) => void
  placeholder?: string
  required?: boolean
  size?: DatePickerSize
  value?: string
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    className,
    disabled = false,
    displayFormat = 'YYYY-MM-DD',
    invalid = false,
    id,
    max,
    min,
    onValueChange,
    placeholder = '选择日期',
    required = false,
    size = 'md',
    value,
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const display = value ? dayjs(value).format(displayFormat) : ''
  const controlProps = useFieldControlProps({
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': invalid,
    disabled,
    id,
    required,
  })
  const effectiveAriaLabel = ariaLabel ?? (controlProps.id ? undefined : '选择日期')

  return (
    <Popover.Root className={className} onOpenChange={setOpen} open={open} placement="bottom-start">
      <Popover.Trigger>
        <button
          aria-label={effectiveAriaLabel}
          aria-describedby={controlProps['aria-describedby']}
          aria-invalid={controlProps['aria-invalid']}
          aria-required={controlProps.required || undefined}
          className="ods-date-picker"
          data-invalid={controlProps['aria-invalid'] || undefined}
          data-size={size}
          data-slot="date-picker"
          disabled={controlProps.disabled}
          id={controlProps.id}
          ref={ref}
          type="button"
        >
          <span aria-hidden="true" className="ods-date-picker__icon">
            <i className="ri-calendar-line" />
          </span>
          <span className="ods-date-picker__value" data-placeholder={display ? undefined : ''}>
            {display || placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Content
        className="ods-date-picker__popover"
        initialFocus={DATE_PICKER_INITIAL_FOCUS}
        role="dialog"
      >
        <DatePickerCalendar max={max} min={min} onValueChange={onValueChange} value={value} />
      </Popover.Content>
    </Popover.Root>
  )
})
