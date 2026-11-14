/** 产品分类树节点(GET /crm/product-categories/tree,children 为空时是 []) */
export interface ProductCategory {
  id: number
  /** 顶级分类为 0 */
  parent_id: number
  name: string
  sort: number
  /** 1启用 0停用 */
  status: number
  children: ProductCategory[]
}

/** 产品分类新增/编辑 payload(POST / PUT) */
export interface ProductCategoryPayload {
  name: string
  /** 顶级传 0 */
  parent_id?: number
  sort?: number
  /** 1启用 0停用 */
  status?: number
}
