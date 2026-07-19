import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders title, content, action, and semantic feedback role', () => {
    render(
      <Alert action={<button type="button">重试</button>} title="同步失败" tone="danger">
        无法连接到远程数据库。
      </Alert>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('data-tone', 'danger')
    expect(screen.getByRole('heading', { name: '同步失败', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('supports an accessible dismiss action and forwarded refs', () => {
    const onDismiss = vi.fn()
    const ref = createRef<HTMLDivElement>()
    render(<Alert onDismiss={onDismiss} ref={ref} title="提示" />)

    const alert = screen.getByRole('status')
    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(ref.current).toBe(alert)
  })
})
