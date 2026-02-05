/**
 * 常用 API 类型集中导出
 * 开发时优先查看此文件，无需翻找 131 个 models 文件
 */

// ==================== 认证相关 ====================
export type { LoginDto, LoginResponseDto, LoginUserDto } from '@/models'

// ==================== 客户相关 ====================
export type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerControllerFindAllParams,
} from '@/models'

// ==================== 合同相关 ====================
export type {
  Contract,
  CreateContractDto,
  UpdateContractDto,
  ContractControllerFindAllParams,
} from '@/models'

// ==================== 产品相关 ====================
export type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductControllerFindAllParams,
} from '@/models'

// ==================== 联系人相关 ====================
export type {
  Contact,
  CreateContactDto,
  UpdateContactDto,
  ContactControllerFindAllParams,
} from '@/models'

// ==================== 发票相关 ====================
export type {
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceControllerFindAllParams,
} from '@/models'

// ==================== 付款相关 ====================
export type {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentControllerFindAllParams,
} from '@/models'

// ==================== 用户相关 ====================
export type {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserControllerFindAllParams,
} from '@/models'

// ==================== 部门相关 ====================
export type {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '@/models'

// ==================== 权限相关 ====================
export type {
  Role,
  Permission,
  CreateRoleDto,
  CreatePermissionDto,
} from '@/models'

// ==================== 自动化相关 ====================
export type {
  AutomationRule,
  CreateAutomationRuleDto,
} from '@/models'

// ==================== 日志相关 ====================
export type {
  LoginLog,
  OperationLog,
  LoginLogsControllerFindLoginLogsParams,
} from '@/models'

// ==================== 跟进记录 ====================
export type {
  FollowRecord,
  CreateFollowRecordDto,
} from '@/models'

// ==================== 服务团队 ====================
export type {
  ServiceTeam,
  CreateServiceTeamDto,
} from '@/models'
