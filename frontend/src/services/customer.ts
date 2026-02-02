import { request } from '@umijs/max';

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  name?: string;
  contactPhone?: string;
  customerLevel?: number;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  customerLevel: number;
  sourceChannel?: number;
  remark?: string;
  followUserId?: string;
  followUser?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateParams {
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  customerLevel?: number;
  sourceChannel?: number;
  remark?: string;
}

export interface CustomerUpdateParams extends Partial<CustomerCreateParams> {}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取客户列表
 */
export async function getCustomers(params: CustomerQueryParams): Promise<CustomerListResponse> {
  return request<CustomerListResponse>('/customers', {
    method: 'GET',
    params,
  });
}

/**
 * 获取客户详情
 */
export async function getCustomerDetail(id: string): Promise<Customer> {
  return request<Customer>(`/customers/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建客户
 */
export async function createCustomer(data: CustomerCreateParams): Promise<Customer> {
  return request<Customer>('/customers', {
    method: 'POST',
    data,
  });
}

/**
 * 更新客户
 */
export async function updateCustomer(
  id: string,
  data: CustomerUpdateParams,
): Promise<Customer> {
  return request<Customer>(`/customers/${id}`, {
    method: 'PATCH',
    data,
  });
}

/**
 * 删除客户
 */
export async function deleteCustomer(id: string): Promise<void> {
  return request(`/customers/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 分配客户
 */
export async function assignCustomer(data: {
  customerIds: string[];
  followUserId: string;
}): Promise<void> {
  return request('/customers/assign', {
    method: 'POST',
    data,
  });
}
