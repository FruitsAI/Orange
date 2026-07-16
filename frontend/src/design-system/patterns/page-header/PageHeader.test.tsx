import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('provides one page title with optional context and actions', () => {
    render(
      <PageHeader
        actions={<button type="button">新建项目</button>}
        description="统一查看项目进度与回款状态。"
        eyebrow="项目管理"
        leading={<button aria-label="返回" type="button" />}
        title="项目"
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: '项目' })).toBeInTheDocument()
    expect(screen.getByText('项目管理')).toHaveClass('ods-page-header__eyebrow')
    expect(screen.getByText('统一查看项目进度与回款状态。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建项目' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument()
  })
})
