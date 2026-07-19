import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Project } from '@/api/project'
import { render } from '@/test/render'
import ProjectList from './ProjectList'

const project = (id: number, overrides: Partial<Project> = {}) =>
  ({
    company: `客户 ${id}`,
    id,
    name: `项目 ${id}`,
    received_amount: 25_000,
    status: 'active',
    total_amount: 100_000,
    ...overrides,
  }) as Project

describe('ProjectList compact dashboard list', () => {
  it('limits recent projects to five accessible row links', () => {
    render(<ProjectList projects={Array.from({ length: 7 }, (_, index) => project(index + 1))} />)

    const links = screen.getAllByRole('link', { name: /项目/ })
    expect(links).toHaveLength(5)
    expect(links[0]).toHaveAttribute('href', '/projects/1')
    expect(links[4]).toHaveAttribute('href', '/projects/5')
  })

  it('keeps project, client, status, amount, and progress visible without table controls', () => {
    const { container } = render(
      <ProjectList
        projects={[
          project(9, {
            company: '橙子科技',
            name: '未来展厅',
            received_amount: 75_000,
            total_amount: 100_000,
          }),
        ]}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: '近期项目' })).toBeInTheDocument()
    expect(screen.getByText('最近创建的项目')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /未来展厅/ })
    expect(link).toHaveAttribute('data-identity-width', 'md')
    expect(link.lastElementChild).toHaveAttribute('data-slot', 'icon')
    expect(link).toHaveTextContent('橙子科技')
    expect(link).toHaveTextContent('¥100,000.00')
    expect(link).toHaveTextContent('回款 75%')
    expect(link).toHaveTextContent('进行中')
    expect(screen.getByRole('progressbar', { name: '回款进度75%' })).toHaveAttribute(
      'aria-valuenow',
      '75',
    )
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument()
    expect(container.querySelector('.ods-data-list')).toBeInTheDocument()
    expect(screen.getByText('¥100,000.00')).toHaveAttribute('data-hide-below', 'sm')
    expect(screen.getByText('回款 75%').parentElement).toHaveAttribute('data-layout', 'meter')
  })

  it('shows a useful empty state', () => {
    render(<ProjectList projects={[]} />)

    expect(screen.getByText('还没有近期项目')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '新建项目' })).toHaveAttribute(
      'href',
      '/projects/create',
    )
  })
})
