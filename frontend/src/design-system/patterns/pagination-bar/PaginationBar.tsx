import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Pagination } from '../../components/pagination'

export type PaginationBarLayout = 'centered' | 'split'

export interface PaginationBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  info?: ReactNode
  layout?: PaginationBarLayout
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  paginationLabel?: string
  separated?: boolean
  trailing?: ReactNode
}

export const PaginationBar = forwardRef<HTMLDivElement, PaginationBarProps>(function PaginationBar(
  {
    className,
    info,
    layout = 'split',
    onPageChange,
    page,
    pageCount,
    paginationLabel = '分页',
    separated = false,
    trailing,
    ...props
  },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-pagination-bar', className].filter(Boolean).join(' ')}
      data-layout={layout}
      data-separated={separated || undefined}
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
        <span aria-hidden="true" className="ods-pagination-bar__info" data-slot="info" />
      )}
      <div className="ods-pagination-bar__controls" data-slot="controls">
        <Pagination
          aria-label={paginationLabel}
          onPageChange={onPageChange}
          page={page}
          pageCount={pageCount}
        />
        {trailing ? (
          <div className="ods-pagination-bar__trailing" data-slot="trailing">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  )
})
