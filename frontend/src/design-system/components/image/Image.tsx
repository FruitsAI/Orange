import {
  forwardRef,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

export type ImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
export type ImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
export type ImageBackground = 'default' | 'transparent'

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  background?: ImageBackground
  disableAnimation?: boolean
  fallback?: ReactNode
  fit?: ImageFit
  radius?: ImageRadius
  showSkeleton?: boolean
}

const ImageResource = forwardRef<HTMLImageElement, ImageProps>(function ImageResource(
  {
    alt = '',
    background = 'default',
    className,
    disableAnimation = false,
    fallback,
    fit = 'cover',
    onError,
    onLoad,
    radius = 'md',
    showSkeleton = true,
    src,
    srcSet,
    ...props
  },
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
      data-background={background}
      data-disable-animation={disableAnimation || undefined}
      data-fit={fit}
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
          src={src}
          srcSet={srcSet}
        />
      )}
      {showSkeleton && status === 'loading' ? (
        <span aria-hidden="true" className="ods-image__skeleton" data-slot="skeleton" />
      ) : null}
    </span>
  )
})

export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(props, ref) {
  const resourceKey = JSON.stringify([props.src ?? null, props.srcSet ?? null, props.sizes ?? null])
  return <ImageResource {...props} key={resourceKey} ref={ref} />
})
