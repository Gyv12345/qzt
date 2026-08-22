package mall

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// order.go 商城订单。垂直商城:商品完全复用 crm_product(上架即商城露出),
// 下单时价格/品名落快照,并自动生成 PSI 销售单(散客客户自动创建/复用)。

// 商城订单状态。
const (
	OrderStatusPending   int8 = 1 // 待处理
	OrderStatusConfirmed int8 = 2 // 已确认
	OrderStatusFinished  int8 = 3 // 已完成
	OrderStatusCancelled int8 = 4 // 已取消
)

// MallOrder 商城订单。
type MallOrder struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 订单号(MO+日期+序号)
	OrderNo string `json:"order_no" gorm:"size:64;uniqueIndex:uk_order_no;comment:订单号"`
	// 关联客户(下单时按手机号复用历史客户,无则自动创建公海客户)
	CustomerID *uint `json:"customer_id" gorm:"index;comment:关联客户ID"`
	// 收货人姓名
	ContactName string `json:"contact_name" gorm:"size:64;comment:收货人姓名"`
	// 联系电话
	ContactPhone string `json:"contact_phone" gorm:"size:30;index;comment:联系电话"`
	// 收货地址
	Address string `json:"address" gorm:"size:255;comment:收货地址"`
	// 备注
	Remark string `json:"remark" gorm:"size:500;comment:备注"`
	// 总数量
	TotalQuantity decimal.Decimal `json:"total_quantity" gorm:"type:decimal(14,3);comment:总数量"`
	// 总金额
	TotalAmount decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);comment:总金额"`
	// 1待处理 2已确认 3已完成 4已取消
	Status int8 `json:"status" gorm:"default:1;index;comment:1待处理 2已确认 3已完成 4已取消"`
	// 自动生成的 PSI 销售单ID(无默认仓库时为空,后台可手动补生成)
	PsiOrderID *uint `json:"psi_order_id" gorm:"comment:关联PSI销售单ID"`
	base.BaseModel
}

func (MallOrder) TableName() string { return "mall_order" }

// MallOrderItem 商城订单明细(下单时品名/规格/价格快照)。
type MallOrderItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 订单ID
	OrderID uint `json:"order_id" gorm:"index:idx_order;not null;comment:订单ID"`
	// 商品ID(crm_product)
	ProductID uint `json:"product_id" gorm:"comment:商品ID"`
	// 规格SKU ID(crm_product_sku;0=历史数据未指定)
	SkuID uint `json:"sku_id" gorm:"index;not null;default:0;comment:规格SKU ID"`
	// 商品名称快照
	ProductName string `json:"product_name" gorm:"size:255;comment:商品名称快照"`
	// 规格描述快照(如 红色/M码;空=默认规格)
	Spec string `json:"spec" gorm:"size:128;not null;default:'';comment:规格描述快照"`
	// 数量
	Quantity decimal.Decimal `json:"quantity" gorm:"type:decimal(14,3);comment:数量"`
	// 单价快照(下单时 SKU 售价,无 SKU 时为商品 standard_price)
	UnitPrice decimal.Decimal `json:"unit_price" gorm:"type:decimal(14,2);comment:单价快照"`
	// 金额
	Amount decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);comment:金额"`
	base.BaseModel
}

func (MallOrderItem) TableName() string { return "mall_order_item" }
