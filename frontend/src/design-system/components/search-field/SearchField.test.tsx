import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchField } from './SearchField'

describe('SearchField', () => {
  it('is controlled and reports text changes', async () => {
    const onValueChange = vi.fn()
    render(<SearchField onValueChange={onValueChange} placeholder="搜索项目" value="" />)

    const input = screen.getByRole('searchbox', { name: '搜索' })
    await userEvent.type(input, 'Orange')

    expect(onValueChange).toHaveBeenCalled()
    expect(onValueChange).toHaveBeenLastCalledWith('e')
  })

  it('keeps the input and its group on the same control size', () => {
    render(<SearchField onValueChange={() => undefined} size="lg" value="" />)

    const input = screen.getByRole('searchbox', { name: '搜索' })
    expect(input).toHaveAttribute('data-size', 'lg')
    expect(input.closest('.ods-input-group')).toHaveAttribute('data-size', 'lg')
  })

  it('clears through the controlled callback and optional notification', async () => {
    const onClear = vi.fn()
    const onValueChange = vi.fn()
    render(<SearchField onClear={onClear} onValueChange={onValueChange} value="客户管理" />)

    await userEvent.click(screen.getByRole('button', { name: '清空搜索' }))
    expect(onValueChange).toHaveBeenCalledWith('')
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('replaces the clear action with an announced pending state', () => {
    render(<SearchField onValueChange={() => undefined} pending value="Orange" />)

    expect(screen.getByRole('searchbox', { name: '搜索' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status', { name: '搜索中' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '清空搜索' })).not.toBeInTheDocument()
  })
})
