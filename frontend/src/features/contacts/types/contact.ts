import { z } from 'zod'

export const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  wechat: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  birthdate: z.string().optional(),
  tags: z.string().optional(),
  remark: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Contact = z.infer<typeof contactSchema>

export interface ContactListResponse {
  items: Contact[]
  total: number
  page: number
  pageSize: number
}
