export interface PaymentPlanItem {
  clientKey: string
  id?: number
  amount: string
  method: string
  planDate: string
  remark: string
  stage: string
  status: string
}

let nextPaymentPlanKey = 0

export const createPaymentPlanItem = (installment = false): PaymentPlanItem => ({
  amount: '',
  clientKey: `payment-plan-${nextPaymentPlanKey++}`,
  method: 'bank_transfer',
  planDate: '',
  remark: '',
  stage: installment ? 'deposit' : 'all',
  status: 'pending',
})
