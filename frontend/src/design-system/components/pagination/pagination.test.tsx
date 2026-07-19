import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('exposes current-page and previous/next navigation semantics', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination onPageChange={onPageChange} page={2} pageCount={4} />)

    expect(screen.getByRole('navigation', { name: '分页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 2 页' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: '上一页' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
    await user.click(screen.getByRole('button', { name: '下一页' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
    await user.click(screen.getByRole('button', { name: '第 4 页' }))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('disables boundary actions and handles an empty page set', () => {
    const { rerender } = render(<Pagination onPageChange={() => {}} page={1} pageCount={3} />)
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()

    rerender(<Pagination onPageChange={() => {}} page={0} pageCount={0} />)
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /第 \d+ 页/ })).not.toBeInTheDocument()
  })

  it('keeps large page sets windowed around the current page', () => {
    render(<Pagination onPageChange={() => {}} page={50} pageCount={100} />)

    const pageButtons = screen.getAllByRole('button', { name: /第 \d+ 页/ })
    expect(pageButtons).toHaveLength(7)
    expect(screen.getByRole('button', { name: '第 1 页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 50 页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '第 100 页' })).toBeInTheDocument()
    expect(screen.getAllByText('…')).toHaveLength(2)
  })
})
