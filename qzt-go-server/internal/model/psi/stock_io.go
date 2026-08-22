package psi

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// stock_io.go 其他入库/出库单(盘点盈亏、赠品、领用、损耗等)。创建并提交即生效,无需审批。

// PsiStockInOrder 其他入库单(盘盈/赠品/期初/其他)。提交即增加库存。
type PsiStockInOrder struct {
	ID          uint               `json:"id" gorm:"primaryKey"`
	// 入库单号
	OrderNo     string             `json:"order_no" gorm:"size:64;uniqueIndex:uk_order_no;not null;comment:入库单号"`
	// 入库仓库ID
	WarehouseID uint               `json:"warehouse_id" gorm:"index;not null;comment:入库仓库ID"`
	// 子类型(INIT/PROFIT/GIFT/OTHER)
	BizType     string             `json:"biz_type" gorm:"size:32;index;not null;comment:子类型(INIT/PROFIT/GIFT/OTHER)"`
	// 单据日期
	OrderDate   xtime.NullDateTime `json:"order_date" gorm:"type:datetime;comment:单据日期"`
	// 合计金额
	TotalAmount decimal.Decimal    `json:"total_amount" gorm:"type:decimal(14,2);default:0;comment:合计金额"`
	// 1待生效 2已生效
	Status      int8               `json:"status" gorm:"default:1;index;comment:1待生效 2已生效"`
	// 经办人ID
	OperatorID  *uint              `json:"operator_id" gorm:"index;comment:经办人ID"`
	Remark      string             `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiStockInOrder) TableName() string { return "psi_stock_in_order" }

// PsiStockInOrderDetail 其他入库明细。
type PsiStockInOrderDetail struct {
	ID        uint            `json:"id" gorm:"primaryKey"`
	// 入库单ID
	OrderID   uint            `json:"order_id" gorm:"index:idx_order;not null;comment:入库单ID"`
	// 商品ID
	ProductID uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 规格SKU ID(引用crm_product_sku.id;0=历史数据未指定)
	SkuID     uint            `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 入库数量
	Quantity  decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:入库数量"`
	// 单位成本
	UnitCost  decimal.Decimal `json:"unit_cost" gorm:"type:decimal(14,2);comment:单位成本"`
	Remark    string          `json:"remark" gorm:"size:500"`
	// 规格描述(非表字段,详情接口批量回填展示用)
	SkuSpec   string          `json:"sku_spec" gorm:"-"`
	base.BaseModel
}

func (PsiStockInOrderDetail) TableName() string { return "psi_stock_in_order_detail" }

// PsiStockOutOrder 其他出库单(盘亏/报损/领用/其他)。提交即减少库存。
type PsiStockOutOrder struct {
	ID          uint               `json:"id" gorm:"primaryKey"`
	// 出库单号
	OrderNo     string             `json:"order_no" gorm:"size:64;uniqueIndex:uk_order_no;not null;comment:出库单号"`
	// 出库仓库ID
	WarehouseID uint               `json:"warehouse_id" gorm:"index;not null;comment:出库仓库ID"`
	// 子类型(LOSS/SCRAP/USE/OTHER)
	BizType     string             `json:"biz_type" gorm:"size:32;index;not null;comment:子类型(LOSS/SCRAP/USE/OTHER)"`
	// 单据日期
	OrderDate   xtime.NullDateTime `json:"order_date" gorm:"type:datetime;comment:单据日期"`
	// 1待生效 2已生效
	Status      int8               `json:"status" gorm:"default:1;index;comment:1待生效 2已生效"`
	// 经办人ID
	OperatorID  *uint              `json:"operator_id" gorm:"index;comment:经办人ID"`
	Remark      string             `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiStockOutOrder) TableName() string { return "psi_stock_out_order" }

// PsiStockOutOrderDetail 其他出库明细。
type PsiStockOutOrderDetail struct {
	ID        uint            `json:"id" gorm:"primaryKey"`
	// 出库单ID
	OrderID   uint            `json:"order_id" gorm:"index:idx_order;not null;comment:出库单ID"`
	// 商品ID
	ProductID uint            `json:"product_id" gorm:"index;not null;comment:商品ID"`
	// 规格SKU ID(引用crm_product_sku.id;0=历史数据未指定)
	SkuID     uint            `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 出库数量
	Quantity  decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);not null;comment:出库数量"`
	Remark    string          `json:"remark" gorm:"size:500"`
	// 规格描述(非表字段,详情接口批量回填展示用)
	SkuSpec   string          `json:"sku_spec" gorm:"-"`
	base.BaseModel
}

func (PsiStockOutOrderDetail) TableName() string { return "psi_stock_out_order_detail" }
