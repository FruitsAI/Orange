import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean
  visuallyHidden?: boolean
  wrapperClassName?: string
}

export const TableRoot = forwardRef<HTMLTableElement, TableProps>(function TableRoot(
  { children, className, stickyHeader = false, visuallyHidden = false, wrapperClassName, ...props },
  ref,
) {
  return (
    <div
      className={cx('ods-table__scroll', visuallyHidden && 'ods-sr-only', wrapperClassName)}
      data-slot="scroll"
    >
      <table
        {...props}
        className={cx('ods-table', className)}
        data-slot="table"
        data-sticky={stickyHeader || undefined}
        ref={ref}
      >
        {children}
      </table>
    </div>
  )
})

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return (
    <thead {...props} className={cx('ods-table__header', className)} data-slot="header" ref={ref} />
  )
})

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return (
    <tbody {...props} className={cx('ods-table__body', className)} data-slot="body" ref={ref} />
  )
})

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean
  selected?: boolean
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { className, interactive = false, selected = false, ...props },
  ref,
) {
  return (
    <tr
      {...props}
      aria-selected={selected || undefined}
      className={cx('ods-table__row', className)}
      data-interactive={interactive || undefined}
      data-selected={selected || undefined}
      data-slot="row"
      ref={ref}
    />
  )
})

export type TableStickySide = 'start' | 'end'

export interface TableColumnProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end'
  sticky?: TableStickySide
}

export const TableColumn = forwardRef<HTMLTableCellElement, TableColumnProps>(function TableColumn(
  { align = 'start', className, scope = 'col', sticky, ...props },
  ref,
) {
  return (
    <th
      {...props}
      className={cx('ods-table__column', className)}
      data-align={align}
      data-slot="column"
      data-sticky={sticky}
      ref={ref}
      scope={scope}
    />
  )
})

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end'
  sticky?: TableStickySide
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align = 'start', className, sticky, ...props },
  ref,
) {
  return (
    <td
      {...props}
      className={cx('ods-table__cell', className)}
      data-align={align}
      data-slot="cell"
      data-sticky={sticky}
      ref={ref}
    />
  )
})

// Compound component namespaces are intentionally exported as a stable object.
// eslint-disable-next-line react-refresh/only-export-components
export const Table = {
  Body: TableBody,
  Cell: TableCell,
  Column: TableColumn,
  Header: TableHeader,
  Root: TableRoot,
  Row: TableRow,
}
