import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaginationBar } from './PaginationBar'

describe('PaginationBar', () => {
  it('combines live result information with the shared Pagination control', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationBar
        info="显示 1-10 条，共 24 条"
        onPageChange={onPageChange}
        page={1}
        pageCount={3}
        separated
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('显示 1-10 条，共 24 条')
    expect(screen.getByRole('status').parentElement).toHaveAttribute('data-separated', 'true')
    await userEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
