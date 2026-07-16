import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project'
import { useAuthStore } from '@/stores/auth'
import { render } from '@/test/render'
import ProjectsView from './ProjectsView'

vi.mock('@/api/project', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/project')>()
  return {
    ...original,
    projectApi: {
      ...original.projectApi,
      archive: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    },
  }
})

const project = {
  company: '橙子科技',
  contract_date: '2026-07-01',
  contract_number: 'ORANGE-001',
  create_time: '2026-07-01',
  description: '项目说明',
  end_date: '2026-09-30',
  id: 42,
  name: '星轨项目',
  payment_method: '分期付款',
  received_amount: 20_000,
  start_date: '2026-07-01',
  status: 'active',
  total_amount: 100_000,
  type: 'software',
} satisfies Project

const listResponse = {
  data: {
    data: {
      list: [project],
      page: 1,
      page_size: 10,
      total: 1,
      total_pages: 1,
    },
  },
}

function LocationProbe() {
  return <output aria-label="当前位置">{useLocation().pathname}</output>
}

describe('ProjectsView design system migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null })
    vi.mocked(projectApi.list).mockResolvedValue(listResponse as never)
  })

  it('renders the project workflow from Orange Design System components', async () => {
    const { container } = render(<ProjectsView />, { initialEntries: ['/projects'] })

    await waitFor(() => expect(screen.getByText('星轨项目')).toBeInTheDocument())
    expect(container.querySelector('.ods-search-field')).toBeInTheDocument()
    expect(container.querySelector('.ods-table')).toBeInTheDocument()
    expect(container.querySelector('.ods-progress')).toBeInTheDocument()
    expect(container.querySelector('.ods-chip')).toBeInTheDocument()
    expect(container.querySelector('.ods-pagination-bar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /新建项目/ })).toHaveClass('ods-router-button')
    expect(screen.getByRole('link', { name: '星轨项目' })).toHaveClass('ods-router-link')
  })

  it('uses a real project-name link without giving the row button semantics', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ProjectsView />
        <LocationProbe />
      </>,
      { initialEntries: ['/projects'] },
    )

    const projectLink = await screen.findByRole('link', { name: '星轨项目' })
    const row = projectLink.closest('tr')
    expect(projectLink).toHaveAttribute('href', '/projects/42')
    expect(row).not.toHaveAttribute('tabindex')

    await user.click(projectLink)
    expect(screen.getByLabelText('当前位置')).toHaveTextContent('/projects/42')
  })

  it('uses an ODS alert dialog before deleting a project', async () => {
    const user = userEvent.setup()
    render(<ProjectsView />, { initialEntries: ['/projects'] })

    await waitFor(() => expect(screen.getByText('星轨项目')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '星轨项目：删除项目' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('删除项目？')).toBeInTheDocument()
    expect(projectApi.delete).not.toHaveBeenCalled()
  })

  it('does not activate project navigation when a nested action receives Enter', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ProjectsView />
        <LocationProbe />
      </>,
      { initialEntries: ['/projects'] },
    )

    const deleteButton = await screen.findByRole('button', { name: '星轨项目：删除项目' })
    deleteButton.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByLabelText('当前位置')).toHaveTextContent('/projects')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
