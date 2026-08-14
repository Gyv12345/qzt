package psi

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// stock.go 库存结余 + 出入库流水。

// PsiStock 库存结余(按 商品+仓库 维度)。quantity 为在手库存。
type PsiStock struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	// 商品ID(引用crm_product.id)
	ProductID   uint            `json:"product_id" gorm:"index;uniqueIndex:uk_product_warehouse;not null;comment:商品ID(引用crm_product.id)"`
	// 仓库ID
	WarehouseID uint            `json:"warehouse_id" gorm:"index;uniqueIndex:uk_product_warehouse;not null;comment:仓库ID"`
	// 在手数量
	Quantity    decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);default:0;comment:在手数量"`
	// 安全库存(预警阈值)
	SafetyStock decimal.Decimal `json:"safety_stock" gorm:"type:decimal(14,3);default:0;comment:安全库存(预警阈值)"`
	base.BaseModel
}

func (PsiStock) TableName() string { return "psi_stock" }

// PsiStockMovement 库存出入库流水(append-only,只增不改不删)。
// in_qty/out_qty 二者之一非零;balance_after 记录本次变动后的结余便于对账。
type PsiStockMovement struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	// 业务类型(PURCHASE_IN/SALES_OUT/...)
	BizType      string          `json:"biz_type" gorm:"size:32;index;not null;comment:业务类型(PURCHASE_IN/SALES_OUT/...)"`
	// 来源单据类型
	BizOrderType string          `json:"biz_order_type" gorm:"size:32;index;comment:来源单据类型"`
	// 来源单据ID
	BizOrderID   *uint           `json:"biz_order_id" gorm:"index;comment:来源单据ID"`
	// 来源单据编号
	BizOrderNo   string          `json:"biz_order_no" gorm:"size:64;index;comment:来源单据编号"`
	// 商品ID
	ProductID    uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 仓库ID
	WarehouseID  uint            `json:"warehouse_id" gorm:"index;not null;comment:仓库ID"`
	// 入库数量
	InQty        decimal.Decimal `json:"in_qty" gorm:"type:decimal(14,3);default:0;comment:入库数量"`
	// 出库数量
	OutQty       decimal.Decimal `json:"out_qty" gorm:"type:decimal(14,3);default:0;comment:出库数量"`
	// 变动后结余
	BalanceAfter decimal.Decimal `json:"balance_after" gorm:"type:decimal(14,3);comment:变动后结余"`
	// 单位成本(入库用)
	UnitCost     decimal.Decimal `json:"unit_cost" gorm:"type:decimal(14,2);comment:单位成本(入库用)"`
	// 操作人ID
	OperatorID   *uint           `json:"operator_id" gorm:"index;comment:操作人ID"`
	Remark       string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiStockMovement) TableName() string { return "psi_stock_movement" }
