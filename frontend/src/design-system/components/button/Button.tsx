import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonTone = 'neutral' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  autoHeight?: boolean
  fullWidth?: boolean
  pending?: boolean
  size?: ButtonSize
  tone?: ButtonTone
  variant?: ButtonVariant
}

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    'aria-busy': ariaBusy,
    autoHeight = false,
    children,
    className,
    disabled,
    fullWidth = false,
    pending = false,
    size = 'md',
    tone = 'neutral',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={pending || ariaBusy || undefined}
      className={joinClasses('ods-button', className)}
      data-auto-height={autoHeight || undefined}
      data-full-width={fullWidth || undefined}
      data-pending={pending || undefined}
      data-size={size}
      data-slot="button"
      data-tone={tone}
      data-variant={variant}
      disabled={disabled || pending}
      ref={ref}
      type={type}
    >
      {children}
    </button>
  )
})

export interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'children'> {
  children: ReactNode
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { children, className, label, ...props },
  ref,
) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={joinClasses('ods-icon-button', className)}
      ref={ref}
    >
      {children}
    </Button>
  )
})
