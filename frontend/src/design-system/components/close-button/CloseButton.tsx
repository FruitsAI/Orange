import { forwardRef, type ReactNode } from 'react'
import { IconButton, type IconButtonProps } from '../button'

export interface CloseButtonProps extends Omit<IconButtonProps, 'children' | 'label'> {
  icon?: ReactNode
  label?: string
}

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton(
  { className, icon, label = '关闭', size = 'sm', variant = 'ghost', ...props },
  ref,
) {
  return (
    <IconButton
      {...props}
      className={['ods-close-button', className].filter(Boolean).join(' ')}
      label={label}
      ref={ref}
      size={size}
      variant={variant}
    >
      {icon ?? <i aria-hidden="true" className="ri-close-line" />}
    </IconButton>
  )
})
