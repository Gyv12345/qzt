import request from '../utils/request'
import type { PaymentPlan, PaymentRecord, PaymentSummary } from '../types/crm'

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

/** 合同的回款计划列表 */
export const listPaymentPlans = (contractId: number) =>
  request.get<unknown, PaymentPlan[]>(`/crm/contracts/${contractId}/payment-plans`)

/** 合同的回款记录列表 */
export const listPaymentRecords = (contractId: number) =>
  request.get<unknown, PaymentRecord[]>(`/crm/contracts/${contractId}/payment-records`)

/** 新建回款计划 */
export const createPaymentPlan = (contractId: number, data: PaymentPlanPayload) =>
  request.post(`/crm/contracts/${contractId}/payment-plans`, data)

/** 更新回款计划 */
export const updatePaymentPlan = (id: number, data: PaymentPlanPayload) =>
  request.put(`/crm/payment-plans/${id}`, data)

/** 删除回款计划 */
export const deletePaymentPlan = (id: number) => request.delete(`/crm/payment-plans/${id}`)

/** 登记回款记录 */
export const createPaymentRecord = (contractId: number, data: PaymentRecordPayload) =>
  request.post(`/crm/contracts/${contractId}/payment-records`, data)

/** 更新回款记录 */
export const updatePaymentRecord = (id: number, data: PaymentRecordPayload) =>
  request.put(`/crm/payment-records/${id}`, data)

/** 删除回款记录 */
export const deletePaymentRecord = (id: number) => request.delete(`/crm/payment-records/${id}`)
