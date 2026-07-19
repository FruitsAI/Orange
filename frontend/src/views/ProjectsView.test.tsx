import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project'
import { useToastStore } from '@/composables/useToast'
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

const originalToastError = useToastStore.getState().error

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}

function LocationProbe() {
  return <output aria-label="当前位置">{useLocation().pathname}</output>
}

describe('ProjectsView design system migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null })
    useToastStore.setState({ error: vi.fn(() => 1) })
    vi.mocked(projectApi.list).mockResolvedValue(listResponse as never)
  })

  afterEach(() => {
    useToastStore.setState({ error: originalToastError })
  })

  it('renders the project workflow from Orange Design System components', async () => {
    const { container } = render(<ProjectsView />, { initialEntries: ['/projects'] })

    await waitFor(() => expect(screen.getByText('星轨项目')).toBeInTheDocument())
    expect(container.querySelector('.ods-search-field')).toBeInTheDocument()
    expect(container.querySelector('.ods-table')).toBeInTheDocument()
    expect(container.querySelector('.ods-progress')).toBeInTheDocument()
    expect(container.querySelector('.ods-chip')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: '项目状态筛选' })).toHaveAttribute(
      'data-variant',
      'accent',
    )
    expect(screen.getByRole('tab', { name: '全部项目' })).toHaveAttribute('aria-selected', 'true')
    const panels = container.querySelectorAll('.project-filter-tabs__panel')
    expect(panels).toHaveLength(6)
    expect([...panels].filter((panel) => !panel.hasAttribute('hidden'))).toHaveLength(1)
    expect(
      [...panels]
        .filter((panel) => panel.hasAttribute('hidden'))
        .every((panel) => panel.childElementCount === 0),
    ).toBe(true)
    expect(container.querySelector('.ods-pagination-bar')).toHaveAttribute(
      'data-layout',
      'centered',
    )
    expect(screen.getByRole('button', { name: '每页条数' })).toHaveAttribute(
      'data-width',
      'content',
    )
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

  it('ignores a deferred rejection from an older list request', async () => {
    const user = userEvent.setup()
    const firstRequest = createDeferred<unknown>()
    const secondRequest = createDeferred<unknown>()
    const toastError = vi.mocked(useToastStore.getState().error)
    vi.mocked(projectApi.list)
      .mockReturnValueOnce(firstRequest.promise as never)
      .mockReturnValueOnce(secondRequest.promise as never)

    render(<ProjectsView />, { initialEntries: ['/projects'] })
    await waitFor(() => expect(projectApi.list).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('tab', { name: '进行中' }))
    await waitFor(() => expect(projectApi.list).toHaveBeenCalledTimes(2))

    await act(async () => {
      firstRequest.reject(new Error('旧请求失败'))
      await Promise.resolve()
    })

    expect(toastError).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await act(async () => {
      secondRequest.resolve(listResponse)
      await Promise.resolve()
    })
    expect(await screen.findByText('星轨项目')).toBeInTheDocument()
  })

  it('does not consume responses or report errors from issued requests after unmount', async () => {
    const completedRequest = createDeferred<unknown>()
    const failedRequest = createDeferred<unknown>()
    const readPayload = vi.fn()
    const toastError = vi.mocked(useToastStore.getState().error)
    vi.mocked(projectApi.list)
      .mockReturnValueOnce(completedRequest.promise as never)
      .mockReturnValueOnce(failedRequest.promise as never)

    const completedView = render(<ProjectsView />, { initialEntries: ['/projects'] })
    const failedView = render(<ProjectsView />, { initialEntries: ['/projects'] })
    await waitFor(() => expect(projectApi.list).toHaveBeenCalledTimes(2))
    completedView.unmount()
    failedView.unmount()

    await act(async () => {
      completedRequest.resolve({
        get data() {
          readPayload()
          return listResponse.data
        },
      })
      failedRequest.reject(new Error('卸载后失败'))
      await Promise.resolve()
    })

    expect(readPayload).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows an ODS error state instead of zero data and retries the list request', async () => {
    const user = userEvent.setup()
    const toastError = vi.mocked(useToastStore.getState().error)
    vi.mocked(projectApi.list).mockRejectedValueOnce(new Error('首次加载失败'))

    render(<ProjectsView />, { initialEntries: ['/projects'] })

    expect(await screen.findByRole('alert')).toHaveTextContent('项目列表加载失败')
    expect(screen.getAllByText('暂不可用')).toHaveLength(3)
    expect(screen.queryByText('0 个')).not.toBeInTheDocument()
    expect(screen.queryByText('暂无项目数据')).not.toBeInTheDocument()
    expect(toastError).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: '重试项目列表' }))

    expect(await screen.findByText('星轨项目')).toBeInTheDocument()
    expect(projectApi.list).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
