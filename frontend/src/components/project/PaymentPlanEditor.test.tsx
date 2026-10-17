import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { PaymentPlanEditor } from './PaymentPlanEditor'
import { createPaymentPlanItem, type PaymentPlanItem } from './paymentPlan'

const installment: PaymentPlanItem = {
  ...createPaymentPlanItem(true),
  amount: '12000',
  planDate: '2026-08-01',
  remark: '首期款',
}

describe('PaymentPlanEditor', () => {
  it('composes Orange Design System form primitives', () => {
    const { container } = render(
      <PaymentPlanEditor installment items={[installment]} onItemsChange={vi.fn()} />,
    )

    expect(container.querySelectorAll('.ods-field')).toHaveLength(6)
    expect(container.querySelector('.ods-input')).toBeInTheDocument()
    expect(container.querySelector('.ods-date-picker')).toBeInTheDocument()
    expect(container.querySelectorAll('.ods-select')).toHaveLength(3)
    expect(container.querySelector('.ods-textarea')).toBeInTheDocument()
    expect(container.querySelector('.ods-surface')).toHaveAttribute('data-focus-within', 'true')
    expect(screen.getByRole('button', { name: '添加分期' })).toHaveClass('ods-button')
  })

  it('adds and removes installments through a controlled value', async () => {
    const user = userEvent.setup()
    const onItemsChange = vi.fn()
    render(<PaymentPlanEditor installment items={[installment]} onItemsChange={onItemsChange} />)

    await user.click(screen.getByRole('button', { name: '添加分期' }))
    expect(onItemsChange).toHaveBeenLastCalledWith([
      installment,
      expect.objectContaining({ stage: 'deposit' }),
    ])

    await user.click(screen.getByRole('button', { name: '删除第 1 期' }))
    expect(onItemsChange).toHaveBeenLastCalledWith([])
  })

  it('keeps a one-time payment fixed to the full-payment stage', () => {
    const oneTime = createPaymentPlanItem()
    render(<PaymentPlanEditor installment={false} items={[oneTime]} onItemsChange={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '添加分期' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除第/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '款项阶段' })).toBeDisabled()
  })
})
