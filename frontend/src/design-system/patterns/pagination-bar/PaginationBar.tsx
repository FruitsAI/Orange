import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Pagination } from '../../components/pagination'

export interface PaginationBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  info?: ReactNode
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  paginationLabel?: string
  trailing?: ReactNode
}

export const PaginationBar = forwardRef<HTMLDivElement, PaginationBarProps>(function PaginationBar(
  { className, info, onPageChange, page, pageCount, paginationLabel = '分页', trailing, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-pagination-bar', className].filter(Boolean).join(' ')}
      data-slot="pagination-bar"
      ref={ref}
    >
      {info ? (
        <span
          aria-live="polite"
          className="ods-pagination-bar__info"
          data-slot="info"
          role="status"
        >
          {info}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="ods-pagination-bar__controls" data-slot="controls">
        <Pagination
          aria-label={paginationLabel}
          onPageChange={onPageChange}
          page={page}
          pageCount={pageCount}
        />
        {trailing}
      </div>
    </div>
  )
})
