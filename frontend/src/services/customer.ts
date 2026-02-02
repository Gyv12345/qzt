import { request } from '@/lib/api-client';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  QueryCustomersParams,
  PaginatedResponse,
} from '@/types';

// 获取客户列表
export const getCustomers = async (params?: QueryCustomersParams) => {
  const res = await request.get<PaginatedResponse<Customer>>('/customers', params);
  return res.data;
};

// 获取客户详情
export const getCustomerDetail = async (id: string) => {
  const res = await request.get<Customer>(`/customers/${id}`);
  return res.data;
};

// 创建客户
export const createCustomer = (data: CreateCustomerRequest) => {
  return request.post<Customer>('/customers', data);
};

// 更新客户
export const updateCustomer = (id: string, data: UpdateCustomerRequest) => {
  return request.patch<Customer>(`/customers/${id}`, data);
};

// 删除客户
export const deleteCustomer = (id: string) => {
  return request.delete(`/customers/${id}`);
};

// 分配客户
export const assignCustomer = (data: { customerIds: string[]; followUserId: string }) => {
  return request.post('/customers/assign', data);
};
