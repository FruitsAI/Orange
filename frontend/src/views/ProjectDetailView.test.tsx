import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { paymentApi, projectApi, type Payment, type Project } from '@/api/project'
import { render } from '@/test/render'
import ProjectDetailView from './ProjectDetailView'

vi.mock('@/api/project', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/project')>()
  return {
    ...original,
    paymentApi: {
      ...original.paymentApi,
      confirm: vi.fn(),
    },
    projectApi: {
      ...original.projectApi,
      get: vi.fn(),
      getPayments: vi.fn(),
    },
  }
})

const project = {
  company: '橙子科技',
  contract_date: '2026-07-01',
  contract_number: 'ORANGE-001',
  create_time: '2026-07-01',
  description: '未来感品牌升级',
  end_date: '2026-09-30',
  id: 42,
  name: '星轨项目',
  payment_method: '分期付款',
  received_amount: 20_000,
  start_date: '2026-07-01',
  status: 'active',
  total_amount: 100_000,
  type: '品牌设计',
} satisfies Project

const payment = {
  actual_date: '',
  amount: 30_000,
  id: 7,
  method: 'bank_transfer',
  percentage: 30,
  plan_date: '2026-08-01',
  project_id: 42,
  remark: '',
  stage: '中期款',
  status: 'pending',
} satisfies Payment

const laterPayment = { ...payment, id: 8, stage: '尾款' } satisfies Payment

const apiResponse = <T,>(data: T) => ({ data: { data } })

function OpenPaymentDeepLink() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/projects/42?tab=payments&payment=8')} type="button">
      打开收款深链
    </button>
  )
}

function renderProjectDetail(initialEntry: string) {
  return render(
    <Routes>
      <Route
        element={
          <>
            <OpenPaymentDeepLink />
            <ProjectDetailView />
          </>
        }
        path="/projects/:id"
      />
    </Routes>,
    { initialEntries: [initialEntry] },
  )
}

describe('ProjectDetailView payment deep links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectApi.get).mockResolvedValue(apiResponse(project) as never)
    vi.mocked(projectApi.getPayments).mockResolvedValue(
      apiResponse([payment, laterPayment]) as never,
    )
    Element.prototype.scrollIntoView = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => undefined)
  })

  it('opens the payment plan tab from the initial search params', async () => {
    renderProjectDetail('/projects/42?tab=payments&payment=7')

    await waitFor(() => expect(screen.getByText('收款记录')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '收款计划' })).toHaveClass('active')
    expect(screen.getByText('中期款')).toBeInTheDocument()
  })

  it('switches to the payment plan tab when search params change', async () => {
    const user = userEvent.setup()
    renderProjectDetail('/projects/42')

    await waitFor(() => expect(screen.getByText('项目整体进度')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '项目概览' })).toHaveClass('active')

    await user.click(screen.getByRole('button', { name: '打开收款深链' }))

    expect(await screen.findByText('收款记录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收款计划' })).toHaveClass('active')
  })

  it('highlights, scrolls to, and focuses the requested payment after loading', async () => {
    renderProjectDetail('/projects/42?tab=payments&payment=7')

    const target = await screen.findByTestId('payment-7')
    await waitFor(() => expect(target).toHaveClass('payment-item--highlighted'))
    expect(target).toHaveAttribute('id', 'payment-7')
    expect(target).toHaveAttribute('tabindex', '-1')
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('repositions when the requested payment changes without reloading payments', async () => {
    const user = userEvent.setup()
    renderProjectDetail('/projects/42?tab=payments&payment=7')

    await waitFor(() =>
      expect(screen.getByTestId('payment-7')).toHaveClass('payment-item--highlighted'),
    )
    await user.click(screen.getByRole('button', { name: '打开收款深链' }))

    await waitFor(() =>
      expect(screen.getByTestId('payment-8')).toHaveClass('payment-item--highlighted'),
    )
    expect(screen.getByTestId('payment-7')).not.toHaveClass('payment-item--highlighted')
    expect(projectApi.getPayments).toHaveBeenCalledTimes(1)
  })

  it('does not steal focus again when payments refresh for the same deep link', async () => {
    const user = userEvent.setup()
    vi.mocked(paymentApi.confirm).mockResolvedValue(apiResponse(payment) as never)
    renderProjectDetail('/projects/42?tab=payments&payment=7')

    const target = await screen.findByTestId('payment-7')
    await waitFor(() => expect(target.scrollIntoView).toHaveBeenCalledTimes(1))
    await user.click(screen.getAllByRole('button', { name: '确认收款' })[0])
    await waitFor(() => expect(projectApi.getPayments).toHaveBeenCalledTimes(2))

    expect(target.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(
      vi.mocked(target.focus).mock.contexts.filter((context) => context === target),
    ).toHaveLength(1)
  })

  it('does not throw when the requested payment is absent or scrolling APIs are unavailable', async () => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
    renderProjectDetail('/projects/42?tab=payments&payment=999')

    await waitFor(() => expect(screen.getByText('收款记录')).toBeInTheDocument())
    expect(screen.queryByTestId('payment-999')).not.toBeInTheDocument()
  })
})
