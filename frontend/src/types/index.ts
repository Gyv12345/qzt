/**
 * 类型桥接层
 *
 * 统一导出所有共享类型，供前端代码使用
 * 这个文件作为 @qzt/shared-types 的中心化导出点
 */

// 通用类型
export * from "@qzt/shared-types/common";
export * from "@qzt/shared-types/utils";

// ============ 认证相关 ============
export type {
  Login,
  LoginResponse,
  LoginUser,
  LoginRole,
} from "@qzt/shared-types/auth";

// ============ 用户相关 ============
export type {
  User,
  UserBase,
  QueryUserParams,
  ResetPassword,
  UserListResponse,
  // Legacy 兼容
  UserLegacy,
  QueryUserParamsLegacy,
  UserListResponseLegacy,
} from "@qzt/shared-types/user";
export {
  userStatusMap,
  getUserStatusLabel,
  userStatusLegacyMap,
  getUserStatusLabelLegacy,
} from "@qzt/shared-types/user";

// ============ 部门相关 ============
export type {
  Department,
  DepartmentBase,
  DepartmentTree,
  // Legacy 兼容
  DepartmentLegacy,
} from "@qzt/shared-types/department";
export {
  departmentStatusMap,
  getDepartmentStatusLabel,
  departmentStatusLegacyMap,
  getDepartmentStatusLabelLegacy,
} from "@qzt/shared-types/department";

// ============ 权限相关 ============
export type {
  Permission,
  PermissionBase,
  Role,
  RoleBase,
  RoleDetail,
  PermissionType,
  RoleType,
  DataScopeType,
} from "@qzt/shared-types/permission";
export {
  permissionTypeMap,
  getPermissionTypeLabel,
  roleTypeMap,
  getRoleTypeLabel,
  dataScopeTypeMap,
  getDataScopeTypeLabel,
} from "@qzt/shared-types/permission";

// ============ 客户相关 ============
export type {
  Customer,
  CustomerBase,
  QueryCustomerParams,
  CustomerListResponse,
  CustomerLevel,
  CustomerStatus,
  CompanyScale,
  // Legacy 兼容
  CustomerLegacy,
  QueryCustomerParamsLegacy,
} from "@qzt/shared-types/customer";
export {
  customerLevelMap,
  getCustomerLevelLabel,
  customerStatusMap,
  getCustomerStatusLabel,
} from "@qzt/shared-types/customer";

// ============ 联系人相关 ============
export type {
  Contact,
  ContactBase,
  QueryContactParams,
  ContactListResponse,
  ContactStatus,
} from "@qzt/shared-types/contact";
export {
  contactStatusMap,
  getContactStatusLabel,
} from "@qzt/shared-types/contact";

// ============ 合同相关 ============
export type {
  Contract,
  ContractBase,
  QueryContractParams,
  ContractListResponse,
  ContractStatus,
  ContractStatusLegacy,
} from "@qzt/shared-types/contract";
export {
  contractStatusMap,
  getContractStatusLabel,
  contractStatusLegacyMap,
  toContractStatus,
  toContractStatusLegacy,
} from "@qzt/shared-types/contract";

// ============ 产品相关 ============
export type {
  Product,
  ProductBase,
  QueryProductParams,
  ProductListResponse,
  ProductStatus,
  ProductStatusLegacy,
} from "@qzt/shared-types/product";
export {
  productStatusMap,
  getProductStatusLabel,
  toProductStatus,
  toProductStatusLegacy,
} from "@qzt/shared-types/product";

// ============ 发票相关 ============
export type {
  Invoice,
  InvoiceBase,
  QueryInvoiceParams,
  InvoiceListResponse,
  InvoiceStatus,
  InvoiceStatusLegacy,
} from "@qzt/shared-types/invoice";
export {
  invoiceStatusMap,
  getInvoiceStatusLabel,
  toInvoiceStatus,
  toInvoiceStatusLegacy,
} from "@qzt/shared-types/invoice";

// ============ 收款相关 ============
export type {
  Payment,
  PaymentBase,
  QueryPaymentParams,
  PaymentListResponse,
  PaymentMethod,
  PaymentStatus,
  PaymentMethodLegacy,
} from "@qzt/shared-types/payment";
export {
  paymentMethodMap,
  getPaymentMethodLabel,
  paymentStatusMap,
  getPaymentStatusLabel,
  toPaymentMethod,
  toPaymentMethodLegacy,
} from "@qzt/shared-types/payment";

// ============ 跟进记录相关 ============
export type {
  FollowRecord,
  FollowRecordBase,
  FollowType,
  FollowTypeLegacy,
} from "@qzt/shared-types/follow-records";
export {
  followTypeMap,
  getFollowTypeLabel,
  toFollowType,
  toFollowTypeLegacy,
} from "@qzt/shared-types/follow-records";

// ============ 服务团队相关 ============
export type {
  ServiceTeam,
  ServiceTeamBase,
  ServiceTeamDetail,
  ServiceRoleCode,
} from "@qzt/shared-types/service-team";
export {
  serviceRoleCodeMap,
  getServiceRoleCodeLabel,
} from "@qzt/shared-types/service-team";

// ============ 定价相关 ============
export type {
  PricingRule,
  PricingRuleBase,
  PricingTier,
  PricingRuleType,
  CalculatePriceParams,
  PriceResult,
} from "@qzt/shared-types/pricing";
export {
  pricingRuleTypeMap,
  getPricingRuleTypeLabel,
} from "@qzt/shared-types/pricing";

// ============ 统计相关 ============
export type {
  DashboardStats,
  DashboardOverview,
  DashboardMonthly,
  StatsQueryParams,
  SalesStats,
  CustomerStats,
} from "@qzt/shared-types/statistics";

// ============ 日志相关 ============
export type {
  OperationLog,
  QueryOperationLogParams,
  OperationLogListResponse,
  SystemLog,
  QuerySystemLogParams,
} from "@qzt/shared-types/logs";
export { logLevelMap, getLogLevelLabel } from "@qzt/shared-types/logs";

// ============ 登录日志相关 ============
export type {
  LoginLog,
  QueryLoginLogParams,
  LoginLogListResponse,
  LoginStatus,
} from "@qzt/shared-types/login-logs";
export {
  loginStatusMap,
  getLoginStatusLabel,
} from "@qzt/shared-types/login-logs";

// ============ OSS 相关 ============
export type {
  FileInfo,
  FileType,
  UploadFile,
  UploadUrl,
  UploadResponse,
} from "@qzt/shared-types/oss";

// ============ 通知相关 ============
export type {
  Notification,
  CreateNotification,
  MarkAsRead,
  NotificationType,
  NotificationStatus,
} from "@qzt/shared-types/notifications";
export {
  notificationTypeMap,
  getNotificationTypeLabel,
  notificationStatusMap,
  getNotificationStatusLabel,
} from "@qzt/shared-types/notifications";

// ============ Webhook 相关 ============
export type {
  WebhookConfig,
  WebhookConfigBase,
  WebhookPlatform,
  SendWebhook,
  TestWebhook,
} from "@qzt/shared-types/webhooks";
export {
  webhookPlatformMap,
  getWebhookPlatformLabel,
} from "@qzt/shared-types/webhooks";

// ============ 社交媒体相关 ============
export type {
  SocialMediaAccount,
  SocialMediaPost,
  SocialMediaPlatform,
  SocialMediaAccountStatus,
  SocialMediaPostStatus,
  Visibility,
} from "@qzt/shared-types/social-media";
export {
  socialMediaPlatformMap,
  getSocialMediaPlatformLabel,
  socialMediaPostStatusMap,
  getSocialMediaPostStatusLabel,
  visibilityMap,
  getVisibilityLabel,
} from "@qzt/shared-types/social-media";
