import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BreadcrumbItem, Breadcrumbs } from './Breadcrumbs'

describe('Breadcrumbs', () => {
  it('marks the current page and links the ancestors', () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem href="/dashboard">工作台</BreadcrumbItem>
        <BreadcrumbItem current>项目详情</BreadcrumbItem>
      </Breadcrumbs>,
    )

    expect(screen.getByRole('navigation', { name: '面包屑' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '工作台' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('项目详情')).toHaveAttribute('aria-current', 'page')
  })
})
