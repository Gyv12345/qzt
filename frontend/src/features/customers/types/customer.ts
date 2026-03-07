// 从共享类型包导入 Customer 相关类型
// 使用 Legacy 版本以保持与现有数字枚举的兼容性
export {
  customerLevelLegacySchema as customerLevelSchema,
  customerSchemaLegacy as customerSchema,
  createCustomerSchemaLegacy as createCustomerSchema,
  updateCustomerSchemaLegacy as updateCustomerSchema,
  queryCustomerSchemaLegacy as queryCustomerSchema,
  toCustomerLevel,
  toCustomerLevelLegacy,
  type CustomerLevelLegacy as CustomerLevel,
  type CustomerLegacy as Customer,
  type QueryCustomerParamsLegacy as QueryCustomerParams,
} from "@qzt/shared-types/customer";

// 单独导入接口类型
import type { CustomerListResponse } from "@qzt/shared-types/customer";

// 重新导出更友好的类型别名
export type { CustomerListResponse };
export type CustomerList = CustomerListResponse;

// 导出字符串枚举版本（供新代码使用）
export type {
  CustomerLevel as CustomerLevelString,
  CustomerStatus,
  Customer as CustomerString,
} from "@qzt/shared-types/customer";
