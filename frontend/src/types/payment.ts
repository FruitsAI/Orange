/**
 * @file payment.ts
 * @description 付款相关类型定义
 */

export interface PaymentItem {
  id?: number
  stage: string
  amount: number
  percentage: number
  plan_date: string
}
