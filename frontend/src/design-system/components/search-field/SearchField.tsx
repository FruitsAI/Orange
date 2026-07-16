import { forwardRef, type KeyboardEvent } from 'react'
import { CloseButton } from '../close-button'
import { Input, InputGroup, type InputProps } from '../input'
import { Spinner } from '../spinner'

export interface SearchFieldProps extends Omit<
  InputProps,
  'children' | 'className' | 'defaultValue' | 'onChange' | 'type' | 'value'
> {
  className?: string
  clearLabel?: string
  inputClassName?: string
  onClear?: () => void
  onValueChange: (value: string) => void
  pending?: boolean
  pendingLabel?: string
  value: string
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    'aria-label': ariaLabel = '搜索',
    className,
    clearLabel = '清空搜索',
    disabled,
    inputClassName,
    onClear,
    onKeyDown,
    onValueChange,
    pending = false,
    pendingLabel = '搜索中',
    size = 'md',
    value,
    ...props
  },
  ref,
) {
  const clear = () => {
    onValueChange('')
    onClear?.()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if (!event.defaultPrevented && event.key === 'Escape' && value && !pending) {
      event.preventDefault()
      clear()
    }
  }

  const endContent = pending ? (
    <Spinner label={pendingLabel} size="sm" />
  ) : value ? (
    <CloseButton disabled={disabled} label={clearLabel} onClick={clear} size="sm" />
  ) : null

  return (
    <InputGroup
      aria-busy={pending || undefined}
      className={['ods-search-field', className].filter(Boolean).join(' ')}
      data-pending={pending || undefined}
      data-size={size}
      endContent={endContent}
      startContent={<i aria-hidden="true" className="ri-search-line ods-search-field__icon" />}
    >
      <Input
        {...props}
        aria-busy={pending || undefined}
        aria-label={ariaLabel}
        className={inputClassName}
        disabled={disabled}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        ref={ref}
        size={size}
        type="search"
        value={value}
      />
    </InputGroup>
  )
})
