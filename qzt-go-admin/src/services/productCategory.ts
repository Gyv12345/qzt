import request from '../utils/request'
import type { ProductCategory, ProductCategoryPayload } from '../types/productCategory'

/** 产品分类树 */
export const getProductCategoryTree = () =>
  request.get<unknown, ProductCategory[]>('/crm/product-categories/tree')

export const createProductCategory = (data: ProductCategoryPayload) =>
  request.post('/crm/product-categories', data)

export const updateProductCategory = (id: number, data: ProductCategoryPayload) =>
  request.put(`/crm/product-categories/${id}`, data)

/** 后端有子分类/商品引用时会拒绝并在 msg 中说明 */
export const deleteProductCategory = (id: number) =>
  request.delete(`/crm/product-categories/${id}`)
