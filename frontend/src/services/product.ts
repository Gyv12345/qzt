import { request } from '@/lib/api-client';

export interface Product {
  id: string
  name: string
  code: string
  description?: string
  price: number
  invoiceLimit: number
  invoiceCount: number
  overLimitPrice: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface CreateProductDto {
  name: string
  code: string
  description?: string
  price: number
  invoiceLimit?: number
  invoiceCount?: number
  overLimitPrice?: number
  status?: number
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface QueryProductDto {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}

export interface ProductListResponse {
  total: number
  data: Product[]
  page: number
  pageSize: number
}

/**
 * 获取产品列表
 */
export async function getProducts(params: QueryProductDto = {}): Promise<ProductListResponse> {
  const res = await request.get<ProductListResponse>('/products', params);
  return res.data;
}

/**
 * 获取产品详情
 */
export async function getProduct(id: string): Promise<Product> {
  const res = await request.get<Product>(`/products/${id}`);
  return res.data;
}

/**
 * 创建产品
 */
export async function createProduct(data: CreateProductDto): Promise<Product> {
  const res = await request.post<Product>('/products', data);
  return res.data;
}

/**
 * 更新产品
 */
export async function updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
  const res = await request.patch<Product>(`/products/${id}`, data);
  return res.data;
}

/**
 * 删除产品
 */
export async function deleteProduct(id: string): Promise<void> {
  await request.delete<void>(`/products/${id}`);
}

/**
 * 获取所有启用的产品
 */
export async function getActiveProducts(): Promise<Product[]> {
  const res = await request.get<Product[]>('/products/active');
  return res.data;
}
