import request from '../utils/request'
import type { PaymentRecord, PaymentSummary } from '../types/crm'

export interface PaymentPlanPayload {
  plan_date: string
  plan_amount: number
  remark?: string
}

export interface PaymentRecordPayload {
  received_date: string
  amount: number
  method?: string
  remark?: string
  plan_id?: number
}

/** 合同回款汇总(总额/已回款/计划列表) */
export const getPaymentSummary = (contractId: number) =>
  request.get<unknown, PaymentSummary>(`/crm/contracts/${contractId}/payment-summary`)

/** 合同的回款记录列表 */
export const listPaymentRecords = (contractId: number) =>
  request.get<unknown, PaymentRecord[]>(`/crm/contracts/${contractId}/payment-records`)

/** 新建回款计划 */
export const createPaymentPlan = (contractId: number, data: PaymentPlanPayload) =>
  request.post(`/crm/contracts/${contractId}/payment-plans`, data)

/** 登记回款记录 */
export const createPaymentRecord = (contractId: number, data: PaymentRecordPayload) =>
  request.post(`/crm/contracts/${contractId}/payment-records`, data)
