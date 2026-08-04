package psi

// constants.go 进销存(PSI)模块状态/类型常量。统一用字符串/数值常量,DB 列存储对应类型。

// ── 通用启用/停用 ──
const (
	StatusEnabled  int8 = 1 // 启用
	StatusDisabled int8 = 2 // 停用
)

// ── 采购单状态 ──
const (
	PurchaseStatusDraft   int8 = 1 // 待入库
	PurchaseStatusReceipt int8 = 2 // 已入库
	PurchaseStatusClosed  int8 = 3 // 已关闭
)

// ── 销售单状态 ──
const (
	SalesStatusDraft    int8 = 1 // 待出库
	SalesStatusShipped  int8 = 2 // 已出库
	SalesStatusClosed   int8 = 3 // 已关闭
)

// ── 退货状态 ──
const (
	ReturnStatusDraft int8 = 1 // 待处理
	ReturnStatusDone  int8 = 2 // 已完成
)

// ── 盘点/其他出入库单状态 ──
const (
	StockIOStatusDraft int8 = 1 // 待生效
	StockIOStatusDone  int8 = 2 // 已生效
)

// StockBizType 库存流水业务类型(append-only psi_stock_movement.biz_type)。
const (
	BizPurchaseIn       = "PURCHASE_IN"        // 采购入库
	BizSalesOut         = "SALES_OUT"          // 销售出库
	BizPurchaseReturnOut = "PURCHASE_RETURN_OUT" // 采购退货出库
	BizSalesReturnIn    = "SALES_RETURN_IN"    // 销售退货入库
	BizStockIn          = "STOCK_IN"           // 其他入库/盘盈
	BizStockOut         = "STOCK_OUT"          // 其他出库/盘亏
	BizInit             = "INIT"               // 期初
)

// StockInType 其他入库子类型(psi_stock_in_order.biz_type)。
const (
	StockInTypeInit    = "INIT"    // 期初
	StockInTypeProfit  = "PROFIT"  // 盘盈
	StockInTypeGift    = "GIFT"    // 赠品
	StockInTypeOther   = "OTHER"   // 其他
)

// StockOutType 其他出库子类型(psi_stock_out_order.biz_type)。
const (
	StockOutTypeLoss = "LOSS" // 盘亏
	StockOutTypeScrap = "SCRAP" // 报损
	StockOutTypeUse  = "USE"  // 领用
	StockOutTypeOther = "OTHER" // 其他
)

// ApprovalStatus 审批状态(由审批引擎写回,对齐 approval 包常量值)。
const (
	ApprovalNone       = "NONE"       // 未触发审批
	ApprovalApproving  = "APPROVING"  // 审批中
	ApprovalApproved   = "APPROVED"   // 已通过
	ApprovalUnapproved = "UNAPPROVED" // 已驳回
	ApprovalRevoked    = "REVOKED"    // 已撤回
)
