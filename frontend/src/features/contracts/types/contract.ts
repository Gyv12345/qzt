import { z } from "zod";

// 合同状态
export const contractStatusSchema = z.union([
  z.literal("UNPAID"), // 待收款
  z.literal("PARTIAL"), // 部分收款
  z.literal("PAID"), // 已收全
]);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

// 合同产品明细
export const contractItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number(),
  originalPrice: z.number(),
  actualPrice: z.number(),
  subtotal: z.number(),
  createdAt: z.coerce.date(),
});

export type ContractItem = z.infer<typeof contractItemSchema>;

// 合同产品（带产品信息）
export const contractItemWithProductSchema = contractItemSchema.extend({
  product: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    description: z.string().optional(),
  }),
});

export type ContractItemWithProduct = z.infer<
  typeof contractItemWithProductSchema
>;

// 合同表单值
export const contractFormItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  originalPrice: z.number().min(0),
  actualPrice: z.number().min(0),
});

export type ContractFormItem = z.infer<typeof contractFormItemSchema>;

// 合同表单值
export const contractFormSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  items: z.array(contractFormItemSchema).min(1, "请至少添加一个产品"),
  serviceStart: z.string().min(1, "请选择服务开始日期"),
  serviceEnd: z.string().min(1, "请选择服务结束日期"),
  remark: z.string().optional(),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;

// 合同 Schema
export const contractSchema = z.object({
  id: z.string(),
  contractNo: z.string(),
  customerId: z.string(),
  customer: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
  originalAmount: z.number(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  status: contractStatusSchema,
  serviceStart: z.coerce.date(),
  serviceEnd: z.coerce.date(),
  remark: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(contractItemWithProductSchema).optional(),
});

export type Contract = z.infer<typeof contractSchema>;

// 合同列表响应
export interface ContractListResponse {
  data: Contract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
