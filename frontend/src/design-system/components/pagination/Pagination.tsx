import { forwardRef, type HTMLAttributes } from 'react'

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  onPageChange: (page: number) => void
  page: number
  pageCount: number
}

export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { 'aria-label': ariaLabel = '分页', className, onPageChange, page, pageCount, ...props },
  ref,
) {
  const normalizedPageCount = Math.max(0, Math.floor(pageCount))
  const currentPage =
    normalizedPageCount === 0 ? 0 : Math.min(normalizedPageCount, Math.max(1, Math.floor(page)))
  const pages = Array.from({ length: normalizedPageCount }, (_, index) => index + 1)
  const previousDisabled = currentPage <= 1
  const nextDisabled = currentPage === 0 || currentPage >= normalizedPageCount

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={['ods-pagination', className].filter(Boolean).join(' ')}
      data-slot="root"
      ref={ref}
    >
      <button
        aria-label="上一页"
        className="ods-pagination__button ods-pagination__button--direction"
        disabled={previousDisabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span className="ods-pagination__pages" data-slot="pages">
        {pages.map((item) => (
          <button
            aria-current={item === currentPage ? 'page' : undefined}
            aria-label={`第 ${item} 页`}
            className="ods-pagination__button"
            data-active={item === currentPage || undefined}
            key={item}
            onClick={() => onPageChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </span>
      <button
        aria-label="下一页"
        className="ods-pagination__button ods-pagination__button--direction"
        disabled={nextDisabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  )
})
