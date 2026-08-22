package psi

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// sales.go 销售管理:销售订单 + 销售退货。customer_id 为买方(引用 crm_customer.id)。

// PsiSalesOrder 销售订单。warehouse_id 为出库仓。
type PsiSalesOrder struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 销售单号
	OrderNo        string          `json:"order_no" gorm:"size:64;uniqueIndex:uk_order_no;not null;comment:销售单号"`
	// 客户ID(引用crm_customer.id)
	CustomerID     uint            `json:"customer_id" gorm:"index;not null;comment:客户ID(引用crm_customer.id)"`
	// 关联合同ID(引用crm_contract.id)
	ContractID     *uint           `json:"contract_id" gorm:"index;comment:关联合同ID(引用crm_contract.id)"`
	// 出库仓库ID
	WarehouseID    uint            `json:"warehouse_id" gorm:"index;not null;comment:出库仓库ID"`
	// 销售日期
	OrderDate      xtime.NullDateTime `json:"order_date" gorm:"type:datetime;comment:销售日期"`
	// 合计数量
	TotalQuantity  decimal.Decimal `json:"total_quantity" gorm:"type:decimal(14,3);default:0;comment:合计数量"`
	// 合计金额
	TotalAmount    decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);default:0;comment:合计金额"`
	// 优惠金额
	DiscountAmount decimal.Decimal `json:"discount_amount" gorm:"type:decimal(14,2);default:0;comment:优惠金额"`
	// 1待出库 2已出库 3已关闭
	Status         int8            `json:"status" gorm:"default:1;index;comment:1待出库 2已出库 3已关闭"`
	// 审批状态(引擎写回)
	ApprovalStatus string          `json:"approval_status" gorm:"size:32;default:NONE;index;comment:审批状态(引擎写回)"`
	// 经办人ID
	OperatorID     *uint           `json:"operator_id" gorm:"index;comment:经办人ID"`
	Remark         string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiSalesOrder) TableName() string { return "psi_sales_order" }

// PsiSalesOrderDetail 销售订单明细。
type PsiSalesOrderDetail struct {
	ID               uint            `json:"id" gorm:"primaryKey"`
	// 销售单ID
	OrderID          uint            `json:"order_id" gorm:"index:idx_order;not null;comment:销售单ID"`
	// 商品ID
	ProductID        uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 规格SKU ID(引用crm_product_sku.id;0=历史数据未指定)
	SkuID            uint            `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 销售数量
	Quantity         decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:销售数量"`
	// 已出库数量(预留部分发货)
	DeliveredQuantity decimal.Decimal `json:"delivered_quantity" gorm:"type:decimal(14,3);default:0;comment:已出库数量(预留部分发货)"`
	// 单价
	UnitPrice        decimal.Decimal `json:"unit_price" gorm:"type:decimal(14,2);not null;comment:单价"`
	// 金额
	Amount           decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);comment:金额"`
	Remark           string          `json:"remark" gorm:"size:500"`
	// 规格描述(非表字段,详情接口批量回填展示用)
	SkuSpec          string          `json:"sku_spec" gorm:"-"`
	base.BaseModel
}

func (PsiSalesOrderDetail) TableName() string { return "psi_sales_order_detail" }

// PsiSalesReturn 销售退货(客户退回,即入库到仓库)。
type PsiSalesReturn struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 退货单号
	ReturnNo       string          `json:"return_no" gorm:"size:64;uniqueIndex:uk_return_no;not null;comment:退货单号"`
	// 关联销售单ID
	OrderID        *uint           `json:"order_id" gorm:"index;comment:关联销售单ID"`
	// 客户ID
	CustomerID     uint            `json:"customer_id" gorm:"index;not null;comment:客户ID"`
	// 入库仓库ID
	WarehouseID    uint            `json:"warehouse_id" gorm:"index;not null;comment:入库仓库ID"`
	// 退货日期
	ReturnDate     xtime.NullDateTime `json:"return_date" gorm:"type:datetime;comment:退货日期"`
	// 合计金额
	TotalAmount    decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);default:0;comment:合计金额"`
	// 1待处理 2已完成
	Status         int8            `json:"status" gorm:"default:1;index;comment:1待处理 2已完成"`
	// 审批状态(引擎写回)
	ApprovalStatus string          `json:"approval_status" gorm:"size:32;default:NONE;index;comment:审批状态(引擎写回)"`
	// 经办人ID
	OperatorID     *uint           `json:"operator_id" gorm:"index;comment:经办人ID"`
	Remark         string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiSalesReturn) TableName() string { return "psi_sales_return" }

// PsiSalesReturnDetail 销售退货明细。
type PsiSalesReturnDetail struct {
	ID        uint            `json:"id" gorm:"primaryKey"`
	// 退货单ID
	ReturnID  uint            `json:"return_id" gorm:"index:idx_return;not null;comment:退货单ID"`
	// 商品ID
	ProductID uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 规格SKU ID(引用crm_product_sku.id;0=历史数据未指定)
	SkuID     uint            `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 退货数量
	Quantity  decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:退货数量"`
	// 单价
	UnitPrice decimal.Decimal `json:"unit_price" gorm:"type:decimal(14,2);not null;comment:单价"`
	// 金额
	Amount    decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);comment:金额"`
	Remark    string          `json:"remark" gorm:"size:500"`
	// 规格描述(非表字段,详情接口批量回填展示用)
	SkuSpec   string          `json:"sku_spec" gorm:"-"`
	base.BaseModel
}

func (PsiSalesReturnDetail) TableName() string { return "psi_sales_return_detail" }
