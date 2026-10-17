import userEvent from '@testing-library/user-event'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, type User } from '@/api/auth'
import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import UserManagement from './UserManagement'

vi.mock('@/api/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/auth')>()
  return {
    ...original,
    authApi: {
      ...original.authApi,
      createUser: vi.fn(),
      getUsers: vi.fn(),
      resetPassword: vi.fn(),
    },
  }
})

const managedUser = {
  avatar: '',
  department: '研发部',
  email: 'orange@example.com',
  id: 7,
  name: '橙子',
  phone: '13800000000',
  position: '工程师',
  role: 'user',
  status: 1,
  username: 'orange',
} satisfies User

const usersResponse = {
  data: {
    data: {
      list: [managedUser],
      total: 1,
    },
  },
}

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('UserManagement search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authApi.getUsers).mockResolvedValue(usersResponse as never)
  })

  it('clears the applied server-side keyword when SearchField is cleared', async () => {
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => expect(authApi.getUsers).toHaveBeenCalledTimes(1))
    const search = screen.getByRole('searchbox', { name: '搜索用户' })
    await user.type(search, 'orange{Enter}')
    await waitFor(() => expect(authApi.getUsers).toHaveBeenCalledTimes(2))
    expect(authApi.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: 'orange', page: 1 }),
    )

    await user.click(screen.getByRole('button', { name: '清空搜索' }))

    expect(search).toHaveValue('')
    await waitFor(() => expect(authApi.getUsers).toHaveBeenCalledTimes(3))
    expect(authApi.getUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: undefined, page: 1 }),
    )
  })

  it('ignores a stale user-list response after the search changes', async () => {
    const firstRequest = deferred<typeof usersResponse>()
    const secondRequest = deferred<typeof usersResponse>()
    vi.mocked(authApi.getUsers)
      .mockReset()
      .mockReturnValueOnce(firstRequest.promise as never)
      .mockReturnValueOnce(secondRequest.promise as never)
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => expect(authApi.getUsers).toHaveBeenCalledTimes(1))
    await user.type(screen.getByRole('searchbox', { name: '搜索用户' }), 'latest{Enter}')
    await waitFor(() => expect(authApi.getUsers).toHaveBeenCalledTimes(2))

    const latestUser = { ...managedUser, id: 8, name: '最新用户', username: 'latest' }
    await act(async () => {
      secondRequest.resolve({
        data: { data: { list: [latestUser], total: 1 } },
      })
      await secondRequest.promise
    })
    expect(await screen.findByText('最新用户')).toBeInTheDocument()

    await act(async () => {
      firstRequest.resolve(usersResponse)
      await firstRequest.promise
    })
    expect(screen.getByText('最新用户')).toBeInTheDocument()
    expect(screen.queryByText('橙子')).not.toBeInTheDocument()
  })

  it('submits a user mutation only once while the first request is pending', async () => {
    const createRequest = deferred<unknown>()
    vi.mocked(authApi.createUser).mockReturnValue(createRequest.promise as never)
    const user = userEvent.setup()
    render(<UserManagement />)

    await waitFor(() => expect(authApi.getUsers).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /新增用户/ }))
    const dialog = await screen.findByRole('dialog', { name: '新增用户' })
    await user.type(within(dialog).getByLabelText(/用户名/), 'new-user')
    await user.type(within(dialog).getByLabelText(/姓名/), '新用户')
    await user.type(within(dialog).getByLabelText(/初始密码/), 'secret123')

    const form = within(dialog).getByRole('button', { name: '保存' }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(authApi.createUser).toHaveBeenCalledTimes(1)
    await act(async () => {
      createRequest.resolve(undefined)
      await createRequest.promise
    })
  })
})
