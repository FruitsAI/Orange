import { forwardRef, type HTMLAttributes } from 'react'

export type ButtonGroupOrientation = 'horizontal' | 'vertical'

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: ButtonGroupOrientation
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { className, orientation = 'horizontal', role = 'group', ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-button-group', className].filter(Boolean).join(' ')}
      data-orientation={orientation}
      data-slot="button-group"
      ref={ref}
      role={role}
    />
  )
})
