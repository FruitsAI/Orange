import { forwardRef, type HTMLAttributes } from 'react'

export type SurfaceVariant = 'base' | 'raised' | 'glass' | 'inset'
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg'

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  padding?: SurfacePadding
  variant?: SurfaceVariant
}

const joinClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ')

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { className, padding = 'md', variant = 'base', ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={joinClasses('ods-surface', className)}
      data-padding={padding}
      data-slot="surface"
      data-variant={variant}
      ref={ref}
    />
  )
})

export type CardVariant = 'transparent' | 'default' | 'secondary' | 'tertiary'

export interface CardRootProps extends HTMLAttributes<HTMLDivElement> {
  padding?: SurfacePadding
  variant?: CardVariant
}

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(function CardRoot(
  { className, padding = 'md', variant = 'default', ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={joinClasses('ods-card', className)}
      data-padding={padding}
      data-slot="root"
      data-variant={variant}
      ref={ref}
    />
  )
})

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={joinClasses('ods-card__header', className)}
      data-slot="header"
      ref={ref}
    />
  )
})

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        {...props}
        className={joinClasses('ods-card__title', className)}
        data-slot="title"
        ref={ref}
      />
    )
  },
)

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        {...props}
        className={joinClasses('ods-card__description', className)}
        data-slot="description"
        ref={ref}
      />
    )
  },
)

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={joinClasses('ods-card__content', className)}
      data-slot="content"
      ref={ref}
    />
  )
})

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={joinClasses('ods-card__footer', className)}
      data-slot="footer"
      ref={ref}
    />
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Card = {
  Content: CardContent,
  Description: CardDescription,
  Footer: CardFooter,
  Header: CardHeader,
  Root: CardRoot,
  Title: CardTitle,
}
