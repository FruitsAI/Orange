import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders decorative iconography, copy, and an action', () => {
    const { container } = render(
      <EmptyState
        action={<a href="/projects/create">新建项目</a>}
        description="创建第一个项目，开始追踪合同与回款进度。"
        icon={<i className="ri-folder-add-line" />}
        title="还没有近期项目"
      />,
    )

    expect(screen.getByText('还没有近期项目')).toHaveClass('empty-state__title')
    expect(screen.getByText('创建第一个项目，开始追踪合同与回款进度。')).toHaveClass(
      'empty-state__description',
    )
    expect(screen.getByRole('link', { name: '新建项目' })).toHaveAttribute(
      'href',
      '/projects/create',
    )
    expect(container.querySelector('.empty-state__icon')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.ri-folder-add-line')).toBeInTheDocument()
  })

  it('omits optional description and action content', () => {
    const { container } = render(
      <EmptyState icon={<i className="ri-checkbox-circle-line" />} title="没有待办" />,
    )

    expect(screen.getByText('没有待办')).toBeInTheDocument()
    expect(container.querySelector('.empty-state__description')).not.toBeInTheDocument()
    expect(container.querySelector('.empty-state__action')).not.toBeInTheDocument()
  })

  it('merges a caller class with the shared empty-state class', () => {
    const { container } = render(
      <EmptyState className="custom-empty" icon={<i />} title="空状态" />,
    )

    expect(container.firstChild).toHaveClass('empty-state', 'custom-empty')
  })
})
