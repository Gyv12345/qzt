import { z } from 'zod'

export const paymentSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  contractCode: z.string().optional(),
  customerName: z.string().optional(),
  amount: z.number(),
  method: z.number(),
  voucherUrl: z.string().optional(),
  payTime: z.string().optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Payment = z.infer<typeof paymentSchema>

export interface PaymentListResponse {
  items: Payment[]
  total: number
  page: number
  pageSize: number
}
