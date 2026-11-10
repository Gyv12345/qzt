import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  PsiPurchaseOrder,
  PsiSalesOrder,
  PsiStock,
  PsiAsset,
  PsiSupplier,
  PsiWarehouse,
  PsiStockMovement,
  PsiPurchaseReturn,
  PsiSalesReturn,
  PsiStockInOrder,
  PsiStockOutOrder,
  PsiStocktake,
  PsiStocktakeDetail,
  PsiStockTransfer,
  PsiStockTransferDetail,
} from '../types/psi'

interface PageResult<T> { list: T[]; total: number }

// ── 采购 ──

export const listPurchaseOrders = (params: PageParams) =>
  request.get<unknown, PageResult<PsiPurchaseOrder>>('/psi/purchase-orders', { params })

export const getPurchaseOrder = (id: number) =>
  request.get<unknown, PsiPurchaseOrder>(`/psi/purchase-orders/${id}`)

// ── 销售 ──

export const listSalesOrders = (params: PageParams) =>
  request.get<unknown, PageResult<PsiSalesOrder>>('/psi/sales-orders', { params })

export const getSalesOrder = (id: number) =>
  request.get<unknown, PsiSalesOrder>(`/psi/sales-orders/${id}`)

// ── 库存 ──

export const listStock = (params: PageParams & { keyword?: string; warehouse_id?: number }) =>
  request.get<unknown, PageResult<PsiStock>>('/psi/stock', { params })

// ── 资产 ──

export const listAssets = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiAsset>>('/psi/assets', { params })

export const getAsset = (id: number) =>
  request.get<unknown, PsiAsset>(`/psi/assets/${id}`)

// ── 供应商 ──

export const listSuppliers = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiSupplier>>('/psi/suppliers', { params })

// ── 仓库 ──

export const listWarehouses = (params: PageParams & { keyword?: string }) =>
  request.get<unknown, PageResult<PsiWarehouse>>('/psi/warehouses', { params })

/** 启用仓库下拉(建 warehouse name 映射用) */
export const listEnabledWarehouses = () =>
  request.get<unknown, PsiWarehouse[]>('/psi/warehouses/enabled')

// ── 库存流水 ──

export const listStockMovements = (params: PageParams & { warehouse_id?: number }) =>
  request.get<unknown, PageResult<PsiStockMovement>>('/psi/stock/movements', { params })

// ── 采购退货 ──

export const listPurchaseReturns = (params: PageParams) =>
  request.get<unknown, PageResult<PsiPurchaseReturn>>('/psi/purchase-returns', { params })

export const getPurchaseReturn = (id: number) =>
  request.get<unknown, PsiPurchaseReturn>(`/psi/purchase-returns/${id}`)

// ── 销售退货 ──

export const listSalesReturns = (params: PageParams) =>
  request.get<unknown, PageResult<PsiSalesReturn>>('/psi/sales-returns', { params })

export const getSalesReturn = (id: number) =>
  request.get<unknown, PsiSalesReturn>(`/psi/sales-returns/${id}`)

// ── 采购单 CRUD + 入库(补充) ──

export interface OrderItemPayload {
  product_id: number
  quantity: number
  unit_price: number
}

export const createPurchaseOrder = (data: {
  supplier_id: number
  warehouse_id: number
  order_date?: string
  remark?: string
  items: OrderItemPayload[]
}) => request.post('/psi/purchase-orders', data)
export const updatePurchaseOrder = (id: number, data: Partial<Parameters<typeof createPurchaseOrder>[0]>) =>
  request.put(`/psi/purchase-orders/${id}`, data)
export const deletePurchaseOrder = (id: number) => request.delete(`/psi/purchase-orders/${id}`)
export const stockInPurchaseOrder = (id: number) => request.post(`/psi/purchase-orders/${id}/stock-in`)

// ── 销售单 CRUD + 出库(补充) ──

export const createSalesOrder = (data: {
  customer_id: number
  warehouse_id: number
  order_date?: string
  remark?: string
  items: OrderItemPayload[]
}) => request.post('/psi/sales-orders', data)
export const updateSalesOrder = (id: number, data: Partial<Parameters<typeof createSalesOrder>[0]>) =>
  request.put(`/psi/sales-orders/${id}`, data)
export const deleteSalesOrder = (id: number) => request.delete(`/psi/sales-orders/${id}`)
export const stockOutSalesOrder = (id: number) => request.post(`/psi/sales-orders/${id}/stock-out`)

// ── 退货(补充) ──

export const createPurchaseReturn = (data: { supplier_id: number; warehouse_id: number; remark?: string; items: OrderItemPayload[] }) =>
  request.post('/psi/purchase-returns', data)
export const stockOutPurchaseReturn = (id: number) => request.post(`/psi/purchase-returns/${id}/stock-out`)
export const createSalesReturn = (data: { customer_id: number; warehouse_id: number; remark?: string; items: OrderItemPayload[] }) =>
  request.post('/psi/sales-returns', data)
export const stockInSalesReturn = (id: number) => request.post(`/psi/sales-returns/${id}/stock-in`)

// ── 其他出入库单(创建即生效,明细结构) ──

export interface StockInItemPayload {
  product_id: number
  quantity: string
  unit_cost?: string
  remark?: string
}
export interface StockOutItemPayload {
  product_id: number
  quantity: string
  remark?: string
}

export const createStockInOrder = (data: {
  warehouse_id: number
  biz_type: string
  order_date?: string
  remark?: string
  items: StockInItemPayload[]
}) => request.post('/psi/stock-in-orders', data)
export const listStockInOrders = (params: PageParams & { warehouse_id?: number; biz_type?: string }) =>
  request.get<unknown, PageResult<PsiStockInOrder>>('/psi/stock-in-orders', { params })
export const getStockInOrder = (id: number) =>
  request.get<unknown, PsiStockInOrder>(`/psi/stock-in-orders/${id}`)

export const createStockOutOrder = (data: {
  warehouse_id: number
  biz_type: string
  order_date?: string
  remark?: string
  items: StockOutItemPayload[]
}) => request.post('/psi/stock-out-orders', data)
export const listStockOutOrders = (params: PageParams & { warehouse_id?: number; biz_type?: string }) =>
  request.get<unknown, PageResult<PsiStockOutOrder>>('/psi/stock-out-orders', { params })
export const getStockOutOrder = (id: number) =>
  request.get<unknown, PsiStockOutOrder>(`/psi/stock-out-orders/${id}`)

// ── 资产 / 供应商 / 仓库 CRUD(补充) ──

export const createAsset = (data: { name: string; asset_no?: string; category?: string; spec?: string; warehouse_id?: number; quantity?: number; value?: string; remark?: string }) =>
  request.post('/psi/assets', data)
export const updateAsset = (id: number, data: Partial<Parameters<typeof createAsset>[0]>) =>
  request.put(`/psi/assets/${id}`, data)
export const deleteAsset = (id: number) => request.delete(`/psi/assets/${id}`)

export const listEnabledSuppliers = () =>
  request.get<unknown, PsiSupplier[]>('/psi/suppliers/enabled')
export const createSupplier = (data: { name: string; supplier_no?: string; contact_name?: string; contact_phone?: string; address?: string; remark?: string }) =>
  request.post('/psi/suppliers', data)
export const updateSupplier = (id: number, data: Partial<Parameters<typeof createSupplier>[0]>) =>
  request.put(`/psi/suppliers/${id}`, data)
export const deleteSupplier = (id: number) => request.delete(`/psi/suppliers/${id}`)

export const createWarehouse = (data: { name: string; code?: string; address?: string; manager?: string; remark?: string }) =>
  request.post('/psi/warehouses', data)
export const updateWarehouse = (id: number, data: Partial<Parameters<typeof createWarehouse>[0]>) =>
  request.put(`/psi/warehouses/${id}`, data)
export const deleteWarehouse = (id: number) => request.delete(`/psi/warehouses/${id}`)

// ---------- 库存盘点/调拨(P15 移动端) ----------

export const listStocktakeOrders = (params?: PageParams & { status?: number }) =>
  request.get<unknown, { list: PsiStocktake[]; total: number }>('/psi/stocktake-orders', { params })

export const getStocktakeOrder = (id: number) =>
  request.get<unknown, PsiStocktakeDetail>(`/psi/stocktake-orders/${id}`)

export const createStocktakeOrder = (data: { warehouse_id: number; remark?: string }) =>
  request.post('/psi/stocktake-orders', data)

export const saveStocktakeActual = (id: number, items: { item_id: number; actual_qty: number }[]) =>
  request.put(`/psi/stocktake-orders/${id}`, { items })

export const confirmStocktakeOrder = (id: number) =>
  request.post(`/psi/stocktake-orders/${id}/confirm`)

export const cancelStocktakeOrder = (id: number) =>
  request.put(`/psi/stocktake-orders/${id}/cancel`)

export const deleteStocktakeOrder = (id: number) =>
  request.delete(`/psi/stocktake-orders/${id}`)

export const listStockTransferOrders = (params?: PageParams & { status?: number }) =>
  request.get<unknown, { list: PsiStockTransfer[]; total: number }>('/psi/stock-transfer-orders', { params })

export const getStockTransferOrder = (id: number) =>
  request.get<unknown, PsiStockTransferDetail>(`/psi/stock-transfer-orders/${id}`)

export const createStockTransferOrder = (data: {
  from_warehouse_id: number
  to_warehouse_id: number
  remark?: string
  items: { product_id: number; sku_id?: number; quantity: number }[]
}) => request.post('/psi/stock-transfer-orders', data)

export const executeStockTransferOrder = (id: number) =>
  request.post(`/psi/stock-transfer-orders/${id}/execute`)

export const cancelStockTransferOrder = (id: number) =>
  request.put(`/psi/stock-transfer-orders/${id}/cancel`)

export const deleteStockTransferOrder = (id: number) =>
  request.delete(`/psi/stock-transfer-orders/${id}`)
