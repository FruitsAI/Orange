import { createElement, forwardRef, type HTMLAttributes, type Ref } from 'react'
import type { SurfaceTone } from '../../components/surface'
import { RouterLink, type RouterLinkProps } from '../router-controls'

export type DataListTone = SurfaceTone
export type DataListHideBelow = 'sm'
export type DataListCellWidth = 'auto' | 'sm' | 'md'

const joinClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ')

export interface DataListRootProps extends HTMLAttributes<HTMLUListElement> {
  as?: 'ol' | 'ul'
}

export const DataListRoot = forwardRef<HTMLUListElement | HTMLOListElement, DataListRootProps>(
  function DataListRoot({ as = 'ul', className, ...props }, ref) {
    return createElement(as, {
      ...props,
      className: joinClasses('ods-data-list', className),
      'data-slot': 'root',
      ref: ref as Ref<HTMLUListElement> & Ref<HTMLOListElement>,
    })
  },
)

export const DataListItem = forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
  function DataListItem({ className, ...props }, ref) {
    return (
      <li
        {...props}
        className={joinClasses('ods-data-list__item', className)}
        data-slot="item"
        ref={ref}
      />
    )
  },
)

export interface DataListLinkProps extends Omit<RouterLinkProps, 'appearance'> {
  markerTone?: DataListTone
}

export const DataListLink = forwardRef<HTMLAnchorElement, DataListLinkProps>(function DataListLink(
  { className, markerTone, ...props },
  ref,
) {
  return (
    <RouterLink
      {...props}
      appearance="row"
      className={joinClasses('ods-data-list__link', className)}
      data-marker-tone={markerTone}
      data-slot="link"
      ref={ref}
    />
  )
})

export const DataListIdentity = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  function DataListIdentity({ className, ...props }, ref) {
    return (
      <span
        {...props}
        className={joinClasses('ods-data-list__identity', className)}
        data-slot="identity"
        ref={ref}
      />
    )
  },
)

export interface DataListMetaProps extends HTMLAttributes<HTMLSpanElement> {
  align?: 'end' | 'start'
  numeric?: boolean
}

export const DataListMeta = forwardRef<HTMLSpanElement, DataListMetaProps>(function DataListMeta(
  { align = 'start', className, numeric = false, ...props },
  ref,
) {
  return (
    <span
      {...props}
      className={joinClasses('ods-data-list__meta', className)}
      data-align={align}
      data-numeric={numeric || undefined}
      data-slot="meta"
      ref={ref}
    />
  )
})

export const DataListPrimary = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  function DataListPrimary({ className, ...props }, ref) {
    return (
      <strong
        {...props}
        className={joinClasses('ods-data-list__primary', className)}
        data-slot="primary"
        ref={ref}
      />
    )
  },
)

export interface DataListSecondaryProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: DataListTone
}

export const DataListSecondary = forwardRef<HTMLSpanElement, DataListSecondaryProps>(
  function DataListSecondary({ className, tone = 'neutral', ...props }, ref) {
    return (
      <span
        {...props}
        className={joinClasses('ods-data-list__secondary', className)}
        data-slot="secondary"
        data-tone={tone}
        ref={ref}
      />
    )
  },
)

export interface DataListCellProps extends HTMLAttributes<HTMLSpanElement> {
  align?: 'center' | 'end' | 'start'
  emphasis?: 'default' | 'strong'
  hideBelow?: DataListHideBelow
  layout?: 'default' | 'meter'
  numeric?: boolean
  width?: DataListCellWidth
}

export const DataListCell = forwardRef<HTMLSpanElement, DataListCellProps>(function DataListCell(
  {
    align = 'start',
    className,
    emphasis = 'default',
    hideBelow,
    layout = 'default',
    numeric = false,
    width = 'auto',
    ...props
  },
  ref,
) {
  return (
    <span
      {...props}
      className={joinClasses('ods-data-list__cell', className)}
      data-align={align}
      data-emphasis={emphasis}
      data-hide-below={hideBelow}
      data-layout={layout}
      data-numeric={numeric || undefined}
      data-slot="cell"
      data-width={width}
      ref={ref}
    />
  )
})

// Compound pattern namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const DataList = {
  Cell: DataListCell,
  Identity: DataListIdentity,
  Item: DataListItem,
  Link: DataListLink,
  Meta: DataListMeta,
  Primary: DataListPrimary,
  Root: DataListRoot,
  Secondary: DataListSecondary,
}
