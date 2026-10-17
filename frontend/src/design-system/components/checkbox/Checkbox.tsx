import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type'
> {
  children?: ReactNode
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { children, className, indeterminate = false, onChange, ...props },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  useLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event)
    event.currentTarget.indeterminate = indeterminate
  }

  return (
    <label
      className={['ods-checkbox', className].filter(Boolean).join(' ')}
      data-disabled={props.disabled || undefined}
      data-indeterminate={indeterminate || undefined}
      data-slot="root"
    >
      <input
        {...props}
        aria-checked={indeterminate ? 'mixed' : props['aria-checked']}
        className="ods-checkbox__input"
        onChange={handleChange}
        ref={setInputRef}
        type="checkbox"
      />
      <span aria-hidden="true" className="ods-checkbox__control" data-slot="control">
        <span className="ods-checkbox__indicator" />
      </span>
      {children ? (
        <span className="ods-checkbox__label" data-slot="label">
          {children}
        </span>
      ) : null}
    </label>
  )
})
