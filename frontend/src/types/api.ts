/**
 * 常用 API 类型集中导出
 * 开发时优先查看此文件，无需翻找 131 个 models 文件
 *
 * ⚠️ 注意：
 * 1. 只导出实际存在的类型
 * 2. 如果需要使用其他类型，请直接从 @/models 导入
 * 3. 后端使用 DTO 模式，没有单一的 Entity 类型
 */

// ==================== 认证相关 ====================
export type {
  LoginDto,
  LoginResponseDto,
  LoginUserDto,
  LoginRoleDto,
} from "@/models";

// ==================== 客户相关 ====================
export type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerControllerFindAllParams,
} from "@/models";

// ==================== 合同相关 ====================
export type {
  CreateContractDto,
  UpdateContractDto,
  ContractControllerFindAllParams,
} from "@/models";

// ==================== 产品相关 ====================
export type {
  CreateProductDto,
  UpdateProductDto,
  ProductControllerFindAllParams,
} from "@/models";

// ==================== 联系人相关 ====================
export type {
  CreateContactDto,
  UpdateContactDto,
  ContactControllerFindAllParams,
} from "@/models";

// ==================== 发票相关 ====================
export type {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceControllerFindAllParams,
} from "@/models";

// ==================== 付款相关 ====================
export type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentControllerFindAllParams,
} from "@/models";

// ==================== 用户相关 ====================
export type {
  CreateUserDto,
  UpdateUserDto,
  UsersControllerFindAllParams,
  UserEntity,
  UserEntityStatus,
} from "@/models";

// ==================== 部门相关 ====================
export type {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentDto,
} from "@/models";

// ==================== 权限相关 ====================
export type { CreateRoleDto, CreatePermissionDto } from "@/models";

// ==================== 日志相关 ====================
export type {
  LoginLogsControllerFindLoginLogsParams,
  LogsControllerFindOperationLogsParams,
} from "@/models";

// ==================== 跟进记录 ====================
export type { CreateFollowRecordDto, UpdateFollowRecordDto } from "@/models";
