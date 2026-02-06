import { z } from "zod";

// 合同状态
export const contractStatusSchema = z.union([
  z.literal("draft"), // 草稿
  z.literal("active"), // 生效
  z.literal("completed"), // 已完成
  z.literal("cancelled"), // 已取消
]);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

// 合同 Schema
export const contractSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  productId: z.string(),
  productName: z.string().optional(),
  amount: z.number(),
  serviceStart: z.string(),
  serviceEnd: z.string(),
  paymentStatus: z.string().optional(),
  remark: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Contract = z.infer<typeof contractSchema>;

// 合同列表响应
export interface ContractListResponse {
  items: Contract[];
  total: number;
  page: number;
  pageSize: number;
}
