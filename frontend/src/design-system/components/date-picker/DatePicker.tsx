import dayjs from 'dayjs'
import { forwardRef, useState } from 'react'
import { Popover } from '../popover'
import { Calendar } from '../calendar'

export type DatePickerSize = 'sm' | 'md' | 'lg'

export interface DatePickerProps {
  'aria-label'?: string
  className?: string
  disabled?: boolean
  displayFormat?: string
  invalid?: boolean
  max?: string
  min?: string
  onValueChange: (value: string) => void
  placeholder?: string
  size?: DatePickerSize
  value?: string
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    'aria-label': ariaLabel = '选择日期',
    className,
    disabled = false,
    displayFormat = 'YYYY-MM-DD',
    invalid = false,
    max,
    min,
    onValueChange,
    placeholder = '选择日期',
    size = 'md',
    value,
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const display = value ? dayjs(value).format(displayFormat) : ''

  return (
    <Popover.Root className={className} onOpenChange={setOpen} open={open} placement="bottom-start">
      <Popover.Trigger>
        <button
          aria-label={ariaLabel}
          className="ods-date-picker"
          data-invalid={invalid || undefined}
          data-size={size}
          data-slot="date-picker"
          disabled={disabled}
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
      <Popover.Content className="ods-date-picker__popover" role="dialog">
        <Calendar
          max={max}
          min={min}
          onValueChange={(next) => {
            onValueChange(next)
            setOpen(false)
          }}
          value={value}
        />
      </Popover.Content>
    </Popover.Root>
  )
})
