import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'

export interface SpacerProps extends HTMLAttributes<HTMLSpanElement> {
  x?: number
  y?: number
}

const gap = (units?: number) =>
  units === undefined ? undefined : `calc(var(--ods-space-1) * ${units})`

export const Spacer = forwardRef<HTMLSpanElement, SpacerProps>(function Spacer(
  { className, style, x = 1, y = 1, ...props },
  ref,
) {
  const spacerStyle: CSSProperties = {
    width: gap(x),
    height: gap(y),
    ...style,
  }

  return (
    <span
      {...props}
      aria-hidden="true"
      className={['ods-spacer', className].filter(Boolean).join(' ')}
      data-slot="spacer"
      ref={ref}
      style={spacerStyle}
    />
  )
})
