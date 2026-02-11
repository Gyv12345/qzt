import { z } from "zod";

export const invoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  contractId: z.string().optional(),
  contractCode: z.string().optional(),
  amount: z.number(),
  count: z.number(),
  month: z.string(),
  remark: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

// 发票项（带额外字段，用于表格展示）
export interface InvoiceItem extends Invoice {
  invoiceNo?: string;
  invoiceDate?: string;
  status?: string;
}

export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}
