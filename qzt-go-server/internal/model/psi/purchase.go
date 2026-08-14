package psi

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// purchase.go 采购管理:采购订单 + 采购退货。

// PsiPurchaseOrder 采购订单。supplier_id 为卖方(供应商),warehouse_id 为入库仓。
type PsiPurchaseOrder struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 采购单号
	OrderNo      string             `json:"order_no" gorm:"size:64;uniqueIndex:uk_order_no;not null;comment:采购单号"`
	// 供应商ID
	SupplierID   uint               `json:"supplier_id" gorm:"index;not null;comment:供应商ID"`
	// 入库仓库ID
	WarehouseID  uint               `json:"warehouse_id" gorm:"index;not null;comment:入库仓库ID"`
	// 采购日期
	OrderDate    xtime.NullDateTime `json:"order_date" gorm:"type:datetime;comment:采购日期"`
	// 预计到货日期
	ExpectedDate xtime.NullDateTime `json:"expected_date" gorm:"type:datetime;comment:预计到货日期"`
	// 合计数量
	TotalQuantity  decimal.Decimal `json:"total_quantity" gorm:"type:decimal(14,3);default:0;comment:合计数量"`
	// 合计金额
	TotalAmount    decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);default:0;comment:合计金额"`
	// 优惠金额
	DiscountAmount decimal.Decimal `json:"discount_amount" gorm:"type:decimal(14,2);default:0;comment:优惠金额"`
	// 1待入库 2已入库 3已关闭
	Status         int8            `json:"status" gorm:"default:1;index;comment:1待入库 2已入库 3已关闭"`
	// 审批状态(引擎写回)
	ApprovalStatus string          `json:"approval_status" gorm:"size:32;default:NONE;index;comment:审批状态(引擎写回)"`
	// 经办人ID
	OperatorID     *uint           `json:"operator_id" gorm:"index;comment:经办人ID"`
	Remark         string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiPurchaseOrder) TableName() string { return "psi_purchase_order" }

// PsiPurchaseOrderDetail 采购订单明细。
type PsiPurchaseOrderDetail struct {
	ID               uint            `json:"id" gorm:"primaryKey"`
	// 采购单ID
	OrderID          uint            `json:"order_id" gorm:"index:idx_order;not null;comment:采购单ID"`
	// 商品ID
	ProductID        uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 采购数量
	Quantity         decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:采购数量"`
	// 已入库数量(预留部分收发)
	ReceivedQuantity decimal.Decimal `json:"received_quantity" gorm:"type:decimal(14,3);default:0;comment:已入库数量(预留部分收发)"`
	// 单价
	UnitPrice        decimal.Decimal `json:"unit_price" gorm:"type:decimal(14,2);not null;comment:单价"`
	// 金额
	Amount           decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);comment:金额"`
	Remark           string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiPurchaseOrderDetail) TableName() string { return "psi_purchase_order_detail" }

// PsiPurchaseReturn 采购退货(退货给供应商,即从仓库出库)。
type PsiPurchaseReturn struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 退货单号
	ReturnNo    string             `json:"return_no" gorm:"size:64;uniqueIndex:uk_return_no;not null;comment:退货单号"`
	// 关联采购单ID
	OrderID      *uint              `json:"order_id" gorm:"index;comment:关联采购单ID"`
	// 供应商ID
	SupplierID   uint               `json:"supplier_id" gorm:"index;not null;comment:供应商ID"`
	// 出库仓库ID
	WarehouseID  uint               `json:"warehouse_id" gorm:"index;not null;comment:出库仓库ID"`
	// 退货日期
	ReturnDate   xtime.NullDateTime `json:"return_date" gorm:"type:datetime;comment:退货日期"`
	// 合计金额
	TotalAmount    decimal.Decimal  `json:"total_amount" gorm:"type:decimal(14,2);default:0;comment:合计金额"`
	// 1待处理 2已完成
	Status         int8             `json:"status" gorm:"default:1;index;comment:1待处理 2已完成"`
	// 审批状态(引擎写回)
	ApprovalStatus string           `json:"approval_status" gorm:"size:32;default:NONE;index;comment:审批状态(引擎写回)"`
	// 经办人ID
	OperatorID     *uint            `json:"operator_id" gorm:"index;comment:经办人ID"`
	Remark         string           `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiPurchaseReturn) TableName() string { return "psi_purchase_return" }

// PsiPurchaseReturnDetail 采购退货明细。
type PsiPurchaseReturnDetail struct {
	ID        uint            `json:"id" gorm:"primaryKey"`
	// 退货单ID
	ReturnID  uint            `json:"return_id" gorm:"index:idx_return;not null;comment:退货单ID"`
	// 商品ID
	ProductID uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 退货数量
	Quantity  decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:退货数量"`
	// 单价
	UnitPrice decimal.Decimal `json:"unit_price" gorm:"type:decimal(14,2);not null;comment:单价"`
	// 金额
	Amount    decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);comment:金额"`
	Remark    string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiPurchaseReturnDetail) TableName() string { return "psi_purchase_return_detail" }
