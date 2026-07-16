import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean
}

export const TableRoot = forwardRef<HTMLTableElement, TableProps>(function TableRoot(
  { children, className, stickyHeader = false, ...props },
  ref,
) {
  return (
    <div className="ods-table__scroll" data-slot="scroll">
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
  selected?: boolean
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { className, selected = false, ...props },
  ref,
) {
  return (
    <tr
      {...props}
      aria-selected={selected || undefined}
      className={cx('ods-table__row', className)}
      data-selected={selected || undefined}
      data-slot="row"
      ref={ref}
    />
  )
})

export interface TableColumnProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end'
}

export const TableColumn = forwardRef<HTMLTableCellElement, TableColumnProps>(function TableColumn(
  { align = 'start', className, scope = 'col', ...props },
  ref,
) {
  return (
    <th
      {...props}
      className={cx('ods-table__column', className)}
      data-align={align}
      data-slot="column"
      ref={ref}
      scope={scope}
    />
  )
})

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end'
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align = 'start', className, ...props },
  ref,
) {
  return (
    <td
      {...props}
      className={cx('ods-table__cell', className)}
      data-align={align}
      data-slot="cell"
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
