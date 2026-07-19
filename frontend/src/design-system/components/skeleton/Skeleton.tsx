import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'

export type SkeletonAnimation = 'shimmer' | 'pulse' | 'none'
export type SkeletonShape = 'rect' | 'text' | 'circle'

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-hidden'> {
  animation?: SkeletonAnimation
  height?: CSSProperties['height']
  shape?: SkeletonShape
  width?: CSSProperties['width']
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  {
    animation = 'shimmer',
    className,
    height,
    shape = 'rect',
    style,
    width,
    ...props
  },
  ref,
) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={['ods-skeleton', className].filter(Boolean).join(' ')}
      data-animation={animation}
      data-shape={shape}
      data-slot="skeleton"
      ref={ref}
      style={{ ...style, height, width }}
    />
  )
})
