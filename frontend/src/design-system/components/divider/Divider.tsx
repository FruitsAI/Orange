import { forwardRef, type HTMLAttributes } from 'react'

export type DividerOrientation = 'horizontal' | 'vertical'

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: DividerOrientation
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(function Divider(
  { className, orientation = 'horizontal', role = 'separator', ...props },
  ref,
) {
  return (
    <div
      {...props}
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      className={['ods-divider', className].filter(Boolean).join(' ')}
      data-orientation={orientation}
      data-slot="divider"
      ref={ref}
      role={role}
    />
  )
})
