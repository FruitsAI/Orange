import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export type SwitchSize = 'sm' | 'md' | 'lg'

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type' | 'size'
> {
  children?: ReactNode
  size?: SwitchSize
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { children, className, disabled, size = 'md', ...props },
  ref,
) {
  return (
    <label
      className={['ods-switch', className].filter(Boolean).join(' ')}
      data-disabled={disabled || undefined}
      data-size={size}
      data-slot="switch"
    >
      <input
        {...props}
        className="ods-switch__input"
        disabled={disabled}
        ref={ref}
        role="switch"
        type="checkbox"
      />
      <span aria-hidden="true" className="ods-switch__track" data-slot="track">
        <span className="ods-switch__thumb" data-slot="thumb" />
      </span>
      {children ? (
        <span className="ods-switch__label" data-slot="label">
          {children}
        </span>
      ) : null}
    </label>
  )
})
