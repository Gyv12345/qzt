package errcode

// errcode.go PSI 进销存模块业务错误码。
// system 使用 1xxxx-5xxxx,cms 使用 6xxxx,PSI 使用 7xxxx 段。

const (
	Success = 0

	// 通用(70000-70099)
	ErrServer   = 70000
	ErrParam    = 70001
	ErrNotFound = 70002

	// 仓库(70100-70199)
	ErrWarehouseNotFound  = 70101
	ErrWarehouseCodeExist = 70102
	ErrWarehouseInUse     = 70103

	// 供应商(70200-70299)
	ErrSupplierNotFound = 70201

	// 库存(70300-70399)
	ErrStockNotFound      = 70301
	ErrStockInsufficient  = 70302 // 出库时库存不足
	ErrStockMovementExist = 70303 // 单据已出入库,不可重复

	// 采购单(70400-70499)
	ErrPurchaseOrderNotFound = 70401
	ErrPurchaseDetailEmpty   = 70402
	ErrPurchaseNotApproved   = 70403 // 采购单未审批通过,不可入库

	// 采购退货(70450-70459)
	ErrPurchaseReturnNotFound = 70451
	ErrPurchaseReturnNotApproved = 70452

	// 销售单(70500-70599)
	ErrSalesOrderNotFound = 70501
	ErrSalesDetailEmpty   = 70502
	ErrSalesNotApproved   = 70503 // 销售单未审批通过,不可出库

	// 销售退货(70550-70559)
	ErrSalesReturnNotFound = 70551
	ErrSalesReturnNotApproved = 70552

	// 其他出入库(70600-70699)
	ErrStockIONotFound = 70601
	ErrStockIODone     = 70602 // 出入库单已生效,不可重复
)
