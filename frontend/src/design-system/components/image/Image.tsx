import {
  forwardRef,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

export type ImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: ReactNode
  radius?: ImageRadius
  showSkeleton?: boolean
}

export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { alt = '', className, fallback, onError, onLoad, radius = 'md', showSkeleton = true, ...props },
  ref,
) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setStatus('loaded')
    onLoad?.(event)
  }

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    setStatus('error')
    onError?.(event)
  }

  return (
    <span
      className={['ods-image', className].filter(Boolean).join(' ')}
      data-radius={radius}
      data-slot="image"
      data-status={status}
    >
      {status === 'error' && fallback ? (
        <span className="ods-image__fallback" data-slot="fallback">
          {fallback}
        </span>
      ) : (
        <img
          {...props}
          alt={alt}
          className="ods-image__img"
          data-loaded={status === 'loaded' || undefined}
          onError={handleError}
          onLoad={handleLoad}
          ref={ref}
        />
      )}
      {showSkeleton && status === 'loading' ? (
        <span aria-hidden="true" className="ods-image__skeleton" data-slot="skeleton" />
      ) : null}
    </span>
  )
})
