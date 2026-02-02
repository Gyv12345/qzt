// API 响应类型
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

// 登录请求类型
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应类型
export interface LoginResponse {
  access_token: string;
  user: User;
}

// 客户等级
export const CustomerLevel = {
  POTENTIAL: 0,    // 潜在
  INTENTION: 1,    // 意向
  FORMAL: 2,       // 正式
  VIP: 3,          // VIP
} as const;

export type CustomerLevel = (typeof CustomerLevel)[keyof typeof CustomerLevel];

// 跟进类型
export const FollowType = {
  PHONE: 1,        // 电话
  WECHAT: 2,       // 微信
  VISIT: 3,        // 上门
  EMAIL: 4,        // 邮件
  OTHER: 5,        // 其他
} as const;

export type FollowType = (typeof FollowType)[keyof typeof FollowType];

// 客户类型
export interface Customer {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  address?: string;
  customerLevel: CustomerLevel;
  sourceChannel?: number;
  followUserId?: string;
  tags?: string;
  remark?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  followUser?: {
    id: string;
    name: string;
    email?: string;
  };
}

// 创建客户请求类型
export interface CreateCustomerRequest {
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  address?: string;
  customerLevel?: CustomerLevel;
  sourceChannel?: number;
  followUserId?: string;
  tags?: string;
  remark?: string;
}

// 更新客户请求类型
export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {}

// 查询客户参数类型
export interface QueryCustomersParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  customerLevel?: CustomerLevel;
  followUserId?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// 跟进记录类型
export interface FollowRecord {
  id: string;
  customerId: string;
  customerName?: string;
  userId: string;
  userName?: string;
  type: FollowType;
  content: string;
  nextTime?: string;
  images?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

// 创建跟进记录请求类型
export interface CreateFollowRecordRequest {
  customerId: string;
  type: FollowType;
  content: string;
  nextTime?: string;
  images?: string;
}

// 合同类型
export interface Contract {
  id: string;
  customerId: string;
  productId: string;
  contractNo: string;
  amount: number;
  paidAmount: number;
  status: number; // 0:待收款 1:部分收款 2:已收全
  serviceStart: string;
  serviceEnd: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
    price: number;
  };
}

// 收款记录类型
export interface Payment {
  id: string;
  contractId: string;
  amount: number;
  method: number; // 1:银行转账 2:微信 3:支付宝 4:现金
  voucherUrl?: string;
  payTime?: string;
  status: number; // 0:待确认 1:已确认
  remark?: string;
  createdAt: string;
  updatedAt: string;
  contract?: {
    id: string;
    contractNo: string;
    amount: number;
    customer?: {
      id: string;
      name: string;
    };
  };
}

// 产品类型
export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  invoiceLimit: number;
  invoiceCount: number;
  overLimitPrice: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  flows?: ProductFlow[];
}

// 产品流程类型
export interface ProductFlow {
  id: string;
  productId: string;
  name: string;
  type: 'NODE' | 'CYCLE';
  config: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建产品请求类型
export interface CreateProductRequest {
  name: string;
  code: string;
  description?: string;
  price: number;
  invoiceLimit: number;
  invoiceCount: number;
  overLimitPrice: number;
}

// 更新产品请求类型
export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

// 查询产品参数类型
export interface QueryProductsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number;
}

// 发票类型
export interface Invoice {
  id: string;
  customerId: string;
  contractId: string;
  invoiceNo: string;
  amount: number;
  invoiceDate: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}
