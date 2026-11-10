package psi

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// inventory.go 库存盘点单/调拨单。
// 与其他出入库单(创建即生效)不同:盘点/调拨走「创建→确认」两段式,
// 确认时才派生库存流水(append-only psi_stock_movement),结余经 stock_core.applyMovement 变动。

// ── 盘点单 ──

// 盘点单状态。
const (
	StocktakeStatusOngoing  int8 = 1 // 盘点中(账面快照已冻结,可录实盘)
	StocktakeStatusDone     int8 = 2 // 已确认(差异已派生盘盈/盘亏流水)
	StocktakeStatusCanceled int8 = 3 // 已作废(未产生任何库存变动)
)

// PsiStocktake 库存盘点单。
type PsiStocktake struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 盘点单号(PD+日期+纳秒尾)
	StocktakeNo string `json:"stocktake_no" gorm:"size:64;uniqueIndex:uk_order_no;not null;comment:盘点单号"`
	// 盘点仓库ID
	WarehouseID uint `json:"warehouse_id" gorm:"index;not null;comment:盘点仓库ID"`
	// 1盘点中 2已确认 3已作废
	Status int8 `json:"status" gorm:"default:1;index;comment:1盘点中 2已确认 3已作废"`
	// 盘点日期
	TakeDate xtime.NullDateTime `json:"take_date" gorm:"type:datetime;comment:盘点日期"`
	// 发起人ID
	OperatorID *uint `json:"operator_id" gorm:"index;comment:发起人ID"`
	// 确认时间
	ConfirmTime xtime.NullDateTime `json:"confirm_time" gorm:"type:datetime;comment:确认时间"`
	// 盘点说明
	Remark string `json:"remark" gorm:"size:500"`
	// 仓库名称(非表字段,列表接口批量回填展示用)
	WarehouseName string `json:"warehouse_name" gorm:"-"`
	base.BaseModel
}

func (PsiStocktake) TableName() string { return "psi_stocktake" }

// PsiStocktakeItem 盘点明细。
type PsiStocktakeItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 盘点单ID
	StocktakeID uint `json:"stocktake_id" gorm:"index:idx_order;not null;comment:盘点单ID"`
	// 商品ID
	ProductID uint `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 规格SKU ID(0=历史数据未指定)
	SkuID uint `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 账面数量(发起时冻结的快照)
	ExpectedQty decimal.Decimal `json:"expected_qty" gorm:"type:decimal(14,3);not null;comment:账面数量(发起时快照)"`
	// 实盘数量(未盘=NULL)
	ActualQty decimal.NullDecimal `json:"actual_qty" gorm:"type:decimal(14,3);comment:实盘数量(未盘为NULL)"`
	// 差异数量(确认时计算 actual-expected,无差异为0)
	DiffQty decimal.Decimal `json:"diff_qty" gorm:"type:decimal(14,3);default:0;comment:差异数量(actual-expected)"`
	Remark  string          `json:"remark" gorm:"size:500"`
	// 规格描述(非表字段,详情接口批量回填展示用)
	SkuSpec string `json:"sku_spec" gorm:"-"`
	base.BaseModel
}

func (PsiStocktakeItem) TableName() string { return "psi_stocktake_item" }

// ── 调拨单 ──

// 调拨单状态。
const (
	TransferStatusInTransit int8 = 1 // 在途(未动库存)
	TransferStatusDone      int8 = 2 // 完成(出+入已同事务落账)
	TransferStatusCanceled  int8 = 3 // 已作废
)

// PsiStockTransfer 库存调拨单。
type PsiStockTransfer struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 调拨单号(DB+日期+纳秒尾)
	TransferNo string `json:"transfer_no" gorm:"size:64;uniqueIndex:uk_order_no;not null;comment:调拨单号"`
	// 调出仓库ID
	FromWarehouseID uint `json:"from_warehouse_id" gorm:"index;not null;comment:调出仓库ID"`
	// 调入仓库ID
	ToWarehouseID uint `json:"to_warehouse_id" gorm:"index;not null;comment:调入仓库ID"`
	// 1在途 2完成 3已作废
	Status int8 `json:"status" gorm:"default:1;index;comment:1在途 2完成 3已作废"`
	// 调拨日期
	TransferDate xtime.NullDateTime `json:"transfer_date" gorm:"type:datetime;comment:调拨日期"`
	// 经办人ID
	OperatorID *uint `json:"operator_id" gorm:"index;comment:经办人ID"`
	// 执行时间
	ExecuteTime xtime.NullDateTime `json:"execute_time" gorm:"type:datetime;comment:执行时间"`
	// 调拨说明
	Remark string `json:"remark" gorm:"size:500"`
	// 调出仓库名称(非表字段,列表接口批量回填展示用)
	FromWarehouseName string `json:"from_warehouse_name" gorm:"-"`
	// 调入仓库名称(非表字段,列表接口批量回填展示用)
	ToWarehouseName string `json:"to_warehouse_name" gorm:"-"`
	base.BaseModel
}

func (PsiStockTransfer) TableName() string { return "psi_stock_transfer" }

// PsiStockTransferItem 调拨明细。
type PsiStockTransferItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 调拨单ID
	TransferID uint `json:"transfer_id" gorm:"index:idx_order;not null;comment:调拨单ID"`
	// 商品ID
	ProductID uint `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 规格SKU ID(0=历史数据未指定)
	SkuID uint `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 调拨数量
	Quantity decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:调拨数量"`
	Remark   string          `json:"remark" gorm:"size:500"`
	// 规格描述(非表字段,详情接口批量回填展示用)
	SkuSpec string `json:"sku_spec" gorm:"-"`
	base.BaseModel
}

func (PsiStockTransferItem) TableName() string { return "psi_stock_transfer_item" }
