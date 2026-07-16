import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncApi } from '@/api/sync'
import { render, screen, waitFor, within } from '@/test/render'
import DataSyncPanel from './DataSyncPanel'

vi.mock('@/api/sync', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/sync')>()
  return {
    ...original,
    syncApi: {
      compare: vi.fn(),
      execute: vi.fn(),
      getConfig: vi.fn(),
      testConnection: vi.fn(),
    },
  }
})

describe('DataSyncPanel design-system composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(syncApi.getConfig).mockResolvedValue({ data: { data: null } } as never)
    vi.mocked(syncApi.testConnection).mockResolvedValue({ data: { data: null } } as never)
    vi.mocked(syncApi.compare).mockResolvedValue({
      data: {
        data: [{ local_count: 12, remote_count: 8, table_name: 'users' }],
      },
    } as never)
  })

  it('moves from ODS form controls to a semantic ODS comparison table', async () => {
    const user = userEvent.setup()
    render(<DataSyncPanel />)

    expect(
      screen.getByRole('heading', { name: '数据同步' }).closest('.ods-section-header'),
    ).not.toBeNull()
    await user.type(screen.getByLabelText(/主机地址/), 'database.example.com')
    await user.type(screen.getByLabelText(/数据库名/), 'orange')
    await user.type(screen.getByLabelText(/用户名/), 'admin')
    await user.click(screen.getByRole('button', { name: /测试连接并下一步/ }))

    await waitFor(() => expect(syncApi.compare).toHaveBeenCalledOnce())
    const table = screen.getByRole('table', { name: '数据对比明细' })
    expect(table).toHaveClass('ods-table')
    expect(within(table).getByRole('columnheader', { name: '数据表' })).toBeInTheDocument()
    expect(within(table).getByText('用户表')).toBeInTheDocument()
    expect(within(table).getByText('差异')).toBeInTheDocument()
  })
})
