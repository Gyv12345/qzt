import { z } from "zod";

// 企业关联信息
export const contactCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  customerLevel: z.string().optional(),
  isPrimary: z.boolean().optional(),
  isDecision: z.boolean().optional(),
  position: z.string().optional(),
  relation: z.string().optional(),
});

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
  // 关联的企业列表
  companies: z.array(contactCompanySchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ContactCompany = z.infer<typeof contactCompanySchema>;

export type Contact = z.infer<typeof contactSchema>;

export interface ContactListResponse {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
}
