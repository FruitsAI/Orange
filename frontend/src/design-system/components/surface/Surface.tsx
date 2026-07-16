import {
  createElement,
  forwardRef,
  type ComponentPropsWithRef,
  type ElementType,
  type HTMLAttributes,
  type ReactElement,
} from 'react'

export type SurfaceVariant = 'base' | 'raised' | 'glass' | 'inset' | 'brand'
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg'
export type SurfaceRadius = 'control' | 'panel' | 'shell' | 'pill'
export type SurfaceTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type IntrinsicElementName = keyof HTMLElementTagNameMap

interface SurfaceOwnProps {
  focusWithin?: boolean
  padding?: SurfacePadding
  radius?: SurfaceRadius
  tone?: SurfaceTone
  variant?: SurfaceVariant
}

const joinClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ')

const resolveIntrinsicElement = (
  as: IntrinsicElementName | undefined,
  componentName: string,
): ElementType => {
  if (as !== undefined && typeof as !== 'string') {
    throw new TypeError(`${componentName} "as" only accepts intrinsic HTML element names`)
  }
  return as ?? 'div'
}

export type SurfaceProps = SurfaceOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof SurfaceOwnProps | 'as'> & {
    as?: never
  }

export type PolymorphicSurfaceProps<T extends IntrinsicElementName> = SurfaceOwnProps &
  Omit<ComponentPropsWithRef<T>, keyof SurfaceOwnProps | 'as'> & {
    as: T
  }

export function Surface<T extends IntrinsicElementName>(
  props: PolymorphicSurfaceProps<T>,
): ReactElement | null
export function Surface(props: SurfaceProps): ReactElement | null
export function Surface({
  as,
  className,
  focusWithin = false,
  padding = 'md',
  radius = 'panel',
  tone = 'neutral',
  variant = 'base',
  ...props
}: SurfaceProps | PolymorphicSurfaceProps<IntrinsicElementName>) {
  const Component = resolveIntrinsicElement(as, 'Surface')

  return createElement(Component, {
    ...props,
    className: joinClasses('ods-surface', className),
    'data-focus-within': focusWithin || undefined,
    'data-padding': padding,
    'data-radius': radius,
    'data-slot': 'surface',
    'data-tone': tone,
    'data-variant': variant,
  })
}

export type CardVariant = 'transparent' | 'default' | 'secondary' | 'tertiary'
export type CardGap = 'none' | 'sm' | 'md' | 'lg'
export type CardOrientation = 'horizontal' | 'vertical'
export type CardTone = SurfaceTone

interface CardRootOwnProps {
  gap?: CardGap
  orientation?: CardOrientation
  padding?: SurfacePadding
  pressable?: boolean
  tone?: CardTone
  variant?: CardVariant
}

export type CardRootProps = CardRootOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof CardRootOwnProps | 'as'> & {
    as?: never
  }

export type PolymorphicCardRootProps<T extends IntrinsicElementName> = CardRootOwnProps &
  Omit<ComponentPropsWithRef<T>, keyof CardRootOwnProps | 'as'> & {
    as: T
  }

function CardRoot<T extends IntrinsicElementName>(
  props: PolymorphicCardRootProps<T>,
): ReactElement | null
function CardRoot(props: CardRootProps): ReactElement | null
function CardRoot({
  as,
  className,
  gap = 'md',
  orientation = 'vertical',
  padding = 'md',
  pressable = false,
  tone = 'neutral',
  variant = 'default',
  ...props
}: CardRootProps | PolymorphicCardRootProps<IntrinsicElementName>) {
  const Component = resolveIntrinsicElement(as, 'Card.Root')

  return createElement(Component, {
    ...props,
    className: joinClasses('ods-card', className),
    'data-gap': gap,
    'data-orientation': orientation,
    'data-padding': padding,
    'data-pressable': pressable || undefined,
    'data-slot': 'root',
    'data-tone': tone,
    'data-variant': variant,
  })
}

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
