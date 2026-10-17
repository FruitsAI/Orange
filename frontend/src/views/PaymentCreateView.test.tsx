import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectApi, type Project } from '@/api/project'
import { render } from '@/test/render'
import PaymentCreateView from './PaymentCreateView'

vi.mock('@/api/project', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/project')>()
  return {
    ...original,
    projectApi: {
      ...original.projectApi,
      list: vi.fn(),
    },
  }
})

const project = {
  company: '橙子科技',
  contract_date: '2026-07-01',
  contract_number: 'ORANGE-001',
  create_time: '2026-07-01',
  description: '',
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

const singlePaymentProject = {
  ...project,
  id: 43,
  name: '年度维护项目',
  payment_method: '一次性付款',
} satisfies Project

describe('PaymentCreateView design system migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectApi.list).mockResolvedValue({
      data: {
        data: {
          list: [project, singlePaymentProject],
          page: 1,
          page_size: 100,
          total: 2,
          total_pages: 1,
        },
      },
    } as never)
  })

  it('uses the shared ODS payment editor and form actions', async () => {
    const { container } = render(
      <Routes>
        <Route element={<PaymentCreateView />} path="/payment/create" />
      </Routes>,
      { initialEntries: ['/payment/create'] },
    )

    expect(screen.getByRole('heading', { name: '创建收款计划' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '添加分期' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: '选择项目' })).toHaveClass('ods-select')
    expect(container.querySelector('.payment-plan-editor')).toBeInTheDocument()
    expect(container.querySelector('.ods-form-actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认保存' })).toHaveClass('ods-button')
  })

  it('normalizes the payment plan when the selected project changes payment mode', async () => {
    const user = userEvent.setup()
    render(
      <Routes>
        <Route element={<PaymentCreateView />} path="/payment/create" />
      </Routes>,
      { initialEntries: ['/payment/create'] },
    )

    await user.click(await screen.findByRole('button', { name: '选择项目' }))
    await user.click(screen.getByRole('option', { name: '年度维护项目' }))

    expect(screen.queryByRole('button', { name: '添加分期' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '款项阶段' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '款项阶段' })).toHaveTextContent('全款')
  })
})
