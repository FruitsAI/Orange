import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenApi } from '@/api/token'
import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import TokenManagement from './TokenManagement'

vi.mock('@/api/token', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/token')>()
  return {
    ...original,
    tokenApi: {
      ...original.tokenApi,
      create: vi.fn(),
      list: vi.fn(),
    },
  }
})

const emptyTokenResponse = { data: { data: [] } }

describe('TokenManagement modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tokenApi.list).mockResolvedValue(emptyTokenResponse as never)
  })

  it('uses shared modal layout and card-style ODS radios in the portalled dialog', async () => {
    const user = userEvent.setup()
    render(<TokenManagement />)

    await waitFor(() => expect(tokenApi.list).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: '生成新令牌' }))

    const dialog = screen.getByRole('dialog', { name: '生成新令牌' })
    expect(dialog.querySelector('.settings-modal-body')).not.toBeNull()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
    radios.forEach((radio) => {
      expect(radio.closest('.ods-radio')).toHaveAttribute('data-variant', 'card')
    })
  })

  it('does not create duplicate tokens from repeated Enter presses', async () => {
    const user = userEvent.setup()
    let resolveCreate: ((value: unknown) => void) | undefined
    vi.mocked(tokenApi.create).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }) as never,
    )
    render(<TokenManagement />)

    await user.click(await screen.findByRole('button', { name: '生成新令牌' }))
    await user.type(screen.getByRole('textbox', { name: /令牌名称/ }), 'CI token')
    await user.keyboard('{Enter}{Enter}')

    expect(tokenApi.create).toHaveBeenCalledTimes(1)
    resolveCreate?.({ data: { data: { token: 'orange-secret' } } })
  })

  it('keeps the one-time token visible when the modal scrim is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(tokenApi.create).mockResolvedValue({
      data: { data: { token: 'orange-secret' } },
    } as never)
    render(<TokenManagement />)

    await user.click(await screen.findByRole('button', { name: '生成新令牌' }))
    await user.type(screen.getByRole('textbox', { name: /令牌名称/ }), 'CI token')
    const createDialog = screen.getByRole('dialog', { name: '生成新令牌' })
    await user.click(within(createDialog).getByRole('button', { name: '生成令牌' }))

    const dialog = await screen.findByRole('dialog', { name: '令牌生成成功' })
    fireEvent.click(dialog.parentElement!)
    expect(dialog).toBeInTheDocument()
  })
})
