import { forwardRef, type HTMLAttributes } from 'react'

export type CodeSize = 'sm' | 'md' | 'lg'
export type CodeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  size?: CodeSize
  tone?: CodeTone
}

export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { className, size = 'md', tone = 'neutral', ...props },
  ref,
) {
  return (
    <code
      {...props}
      className={['ods-code', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="code"
      data-tone={tone}
      ref={ref}
    />
  )
})
