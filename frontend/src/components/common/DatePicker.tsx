interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function DatePicker({
  value,
  onChange,
  placeholder = '请选择日期',
  required = false,
  disabled = false,
  className = '',
}: DatePickerProps) {
  return (
    <div className={`date-picker-wrapper ${className}`.trim()}>
      <div className={`input-trigger ${disabled ? 'is-disabled' : ''}`}>
        <input
          className="readonly-input"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          type="date"
          value={value}
        />
        <i className="ri-calendar-line icon" />
      </div>
    </div>
  )
}
