import { z } from "zod";

/**
 * 合同状态枚举（字符串版本）
 * 0: 未付款, 1: 部分付款, 2: 已付款
 */
export const contractStatusSchema = z.enum(
  ["UNPAID", "PARTIAL", "PAID"],
  {
    errorMap: () => ({ message: "合同状态必须是 UNPAID、PARTIAL 或 PAID" }),
  },
);

export type ContractStatus = z.infer<typeof contractStatusSchema>;

/**
 * 合同产品明细 Schema
 */
export const contractItemSchema = z.object({
  id: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().int().min(1, "数量必须大于0"),
  originalPrice: z.number().min(0, "原价必须大于等于0"),
  actualPrice: z.number().min(0, "实际价格必须大于等于0"),
  subtotal: z.number().min(0, "小计必须大于等于0"),
  createdAt: z.coerce.date(),
});

export type ContractItem = z.infer<typeof contractItemSchema>;

/**
 * 合同产品明细（带产品信息）
 */
export const contractItemWithProductSchema = contractItemSchema.extend({
  product: z.object({
    id: z.string().cuid(),
    name: z.string(),
    price: z.number().min(0),
    description: z.string().optional(),
  }),
});

export type ContractItemWithProduct = z.infer<
  typeof contractItemWithProductSchema
>;

/**
 * 基础合同 Schema
 */
export const contractBaseSchema = z.object({
  customerId: z.string().cuid("请选择有效的客户"),
  items: z
    .array(
      z.object({
        productId: z.string().cuid("请选择有效的产品"),
        quantity: z.number().int().min(1, "数量必须大于0"),
        originalPrice: z.number().min(0, "原价必须大于等于0"),
        actualPrice: z.number().min(0, "实际价格必须大于等于0"),
      }),
    )
    .min(1, "请至少添加一个产品"),
  templateId: z.string().cuid().optional(),
  serviceStart: z.coerce.date(),
  serviceEnd: z.coerce.date(),
  remark: z.string().max(500, "备注最多500个字符").optional(),
});

export type ContractBase = z.infer<typeof contractBaseSchema>;

/**
 * 完整合同 Schema
 */
export const contractSchema = contractBaseSchema
  .extend({
    id: z.string().cuid(),
    contractNo: z.string(), // 合同编号
    originalAmount: z.number().min(0), // 原价总额
    totalAmount: z.number().min(0), // 实际合同总额
    paidAmount: z.number().default(0), // 已付金额
    status: contractStatusSchema.default("UNPAID"),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    items: z.array(contractItemWithProductSchema).optional(),
  })
  .partial({ items: true }); // items 可选，用于列表查询时不包含详细信息

export type Contract = z.infer<typeof contractSchema>;

/**
 * 创建合同 DTO Schema
 */
export const createContractSchema = contractBaseSchema;

/**
 * 更新合同 DTO Schema
 */
export const updateContractSchema = contractBaseSchema.partial();

export type UpdateContractBase = z.infer<typeof updateContractSchema>;

/**
 * 查询合同 DTO Schema
 */
export const queryContractSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  customerId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  status: contractStatusSchema.optional(),
});

export type QueryContractParams = z.infer<typeof queryContractSchema>;

/**
 * 合同列表响应（分页）
 */
export interface ContractListResponse {
  data: Contract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

/**
 * 合同状态映射（用于显示）
 */
export const contractStatusMap: Record<ContractStatus, string> = {
  UNPAID: "待收款",
  PARTIAL: "部分收款",
  PAID: "已收款",
};

/**
 * 获取合同状态显示名称
 */
export function getContractStatusLabel(status: ContractStatus): string {
  return contractStatusMap[status];
}

// Legacy 数字枚举支持
export const contractStatusLegacySchema = z.union([
  z.literal(0), // 未付款 -> UNPAID
  z.literal(1), // 部分付款 -> PARTIAL
  z.literal(2), // 已付款 -> PAID
]);

export type ContractStatusLegacy = z.infer<typeof contractStatusLegacySchema>;

export function toContractStatus(legacy: ContractStatusLegacy): ContractStatus {
  const map = { 0: "UNPAID", 1: "PARTIAL", 2: "PAID" } as const;
  return map[legacy];
}

export function toContractStatusLegacy(status: ContractStatus): ContractStatusLegacy {
  const map = { UNPAID: 0, PARTIAL: 1, PAID: 2 } as const;
  return map[status];
}

export const contractStatusLegacyMap: Record<ContractStatusLegacy, string> = {
  0: "待收款",
  1: "部分收款",
  2: "已收款",
};
