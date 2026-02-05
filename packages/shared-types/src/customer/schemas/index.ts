export {
  customerLevelSchema,
  customerStatusSchema,
  companyScaleSchema,
  customerBaseSchema,
  customerSchema,
  createCustomerSchema,
  updateCustomerSchema,
  queryCustomerSchema,
  customerLevelMap,
  customerStatusMap,
  getCustomerLevelLabel,
  getCustomerStatusLabel,
  type CustomerLevel,
  type CustomerStatus,
  type CompanyScale,
  type CustomerBase,
  type Customer,
  type QueryCustomerParams,
} from './customer.schema'

// Legacy exports for gradual migration (数字枚举版本)
export {
  customerLevelLegacySchema,
  customerSchemaLegacy,
  createCustomerSchemaLegacy,
  updateCustomerSchemaLegacy,
  queryCustomerSchemaLegacy,
  toCustomerLevel,
  toCustomerLevelLegacy,
  type CustomerLevelLegacy,
  type CustomerLegacy,
  type QueryCustomerParamsLegacy,
} from './customer-legacy.schema'

export type { CustomerListResponse } from './customer-legacy.schema'
