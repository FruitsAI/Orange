import { createRef } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('keeps a native checkbox and forwards checked changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(
      <Checkbox onChange={onChange} ref={ref}>
        记住用户名
      </Checkbox>,
    )

    const checkbox = screen.getByRole('checkbox', { name: '记住用户名' })
    expect(ref.current).toBe(checkbox)
    await user.click(checkbox)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(checkbox).toBeChecked()
  })

  it('reflects indeterminate and disabled states on the native control', () => {
    render(
      <Checkbox disabled indeterminate>
        选择全部
      </Checkbox>,
    )

    const checkbox = screen.getByRole('checkbox', { name: '选择全部' })
    expect(checkbox).toBeDisabled()
    expect((checkbox as HTMLInputElement).indeterminate).toBe(true)
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
  })
})
