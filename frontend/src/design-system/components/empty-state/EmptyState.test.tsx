import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders accessible copy, decorative media, and an optional action', () => {
    const { container } = render(
      <EmptyState
        action={<button type="button">新建项目</button>}
        description="创建第一条记录后，数据会显示在这里。"
        icon={<i className="ri-folder-add-line" />}
        title="暂无项目"
      />,
    )

    expect(screen.getByRole('heading', { name: '暂无项目' })).toBeInTheDocument()
    expect(screen.getByText('创建第一条记录后，数据会显示在这里。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建项目' })).toBeInTheDocument()
    expect(container.querySelector('.ods-empty-state__icon')).toHaveAttribute('aria-hidden', 'true')
  })

  it('forwards native props and omits optional regions', () => {
    const { container } = render(<EmptyState className="custom-empty" title="暂无数据" />)

    expect(container.firstChild).toHaveClass('ods-empty-state', 'custom-empty')
    expect(container.querySelector('.ods-empty-state__description')).not.toBeInTheDocument()
    expect(container.querySelector('.ods-empty-state__action')).not.toBeInTheDocument()
  })
})
