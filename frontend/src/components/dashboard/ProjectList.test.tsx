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

describe('ProjectList compact dashboard variant', () => {
  it('limits recent projects to five accessible row links', () => {
    render(
      <ProjectList
        projects={Array.from({ length: 7 }, (_, index) => project(index + 1))}
        variant="compact"
      />,
    )

    const links = screen.getAllByRole('link', { name: /项目/ })
    expect(links).toHaveLength(5)
    expect(links[0]).toHaveAttribute('href', '/projects/1')
    expect(links[4]).toHaveAttribute('href', '/projects/5')
  })

  it('keeps project, client, status, amount, and progress visible without table controls', () => {
    render(
      <ProjectList
        projects={[
          project(9, {
            company: '橙子科技',
            name: '未来展厅',
            received_amount: 75_000,
            total_amount: 100_000,
          }),
        ]}
        variant="compact"
      />,
    )

    const link = screen.getByRole('link', { name: /未来展厅/ })
    expect(link).toHaveTextContent('橙子科技')
    expect(link).toHaveTextContent('¥100,000.00')
    expect(link).toHaveTextContent('75%')
    expect(link).toHaveTextContent('进行中')
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument()
  })

  it('shows a useful empty state', () => {
    render(<ProjectList projects={[]} variant="compact" />)

    expect(screen.getByText('还没有近期项目')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '新建项目' })).toHaveAttribute(
      'href',
      '/projects/create',
    )
  })
})
