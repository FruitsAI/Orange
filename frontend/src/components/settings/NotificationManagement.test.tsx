import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notificationApi, type Notification } from '@/api/notification'
import { render, screen, waitFor } from '@/test/render'
import NotificationManagement from './NotificationManagement'

vi.mock('@/api/notification', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/notification')>()
  return {
    ...original,
    notificationApi: {
      ...original.notificationApi,
      create: vi.fn(),
      delete: vi.fn(),
      getUsers: vi.fn(),
      list: vi.fn(),
      markAsRead: vi.fn(),
      update: vi.fn(),
    },
  }
})

const notification = (id: number, title: string) =>
  ({
    content: `${title}内容`,
    create_time: '2026-07-16T10:00:00Z',
    id,
    is_global: 1,
    is_read: false,
    sender_id: 1,
    title,
    type: 1,
  }) satisfies Notification

const response = (list: Notification[]) => ({ data: { data: { list, total: 10 } } })

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('NotificationManagement request integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationApi.list).mockResolvedValue(
      response([notification(1, '初始通知')]) as never,
    )
  })

  it('does not let an older page response overwrite the latest page', async () => {
    const staleRequest = deferred<ReturnType<typeof response>>()
    const latestRequest = deferred<ReturnType<typeof response>>()
    vi.mocked(notificationApi.list)
      .mockResolvedValueOnce(response([notification(1, '初始通知')]) as never)
      .mockReturnValueOnce(staleRequest.promise as never)
      .mockReturnValueOnce(latestRequest.promise as never)
    const user = userEvent.setup()
    render(<NotificationManagement />)

    expect(await screen.findByText('初始通知')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(2))
    await user.click(screen.getByRole('button', { name: '第 1 页' }))
    await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(3))

    await act(async () => {
      latestRequest.resolve(response([notification(3, '最新通知')]))
      await latestRequest.promise
    })
    expect(await screen.findByText('最新通知')).toBeInTheDocument()

    await act(async () => {
      staleRequest.resolve(response([notification(2, '过期通知')]))
      await staleRequest.promise
    })
    expect(screen.getByText('最新通知')).toBeInTheDocument()
    expect(screen.queryByText('过期通知')).not.toBeInTheDocument()
  })
})
