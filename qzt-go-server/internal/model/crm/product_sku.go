package crm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// product_sku.go 商品规格 SKU。
//
// 每个商品至少有一个 SKU:单规格商品只有一条 spec='' 的「默认规格」记录,
// 由系统在商品创建/更新时自动维护;多规格商品由后台逐条维护(spec 非空)。
// 库存(psi_stock)与所有单据明细按 sku_id 记账/引用,spec='' 的默认 SKU
// 兜底兼容只传 product_id 的旧调用方(移动端/历史数据)。

// CrmProductSku 商品规格 SKU。
type CrmProductSku struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	// 商品ID(引用crm_product.id)
	ProductID uint   `json:"product_id" gorm:"index:idx_product;not null;comment:商品ID(引用crm_product.id)"`
	// 规格描述(如 红色/M码;空串=默认规格,单规格商品的唯一SKU)
	Spec      string `json:"spec" gorm:"size:128;not null;default:'';comment:规格描述(空=默认规格)"`
	// SKU编号(全局唯一,默认规格回退为商品编号)
	SkuNo     string `json:"sku_no" gorm:"size:64;uniqueIndex:uk_sku_no;comment:SKU编号"`
	// 售价(商城/销售默认价)
	Price     decimal.Decimal `json:"price" gorm:"type:decimal(14,2);comment:售价"`
	// 成本价
	CostPrice decimal.Decimal `json:"cost_price" gorm:"type:decimal(14,2);comment:成本价"`
	// 规格图(空则用商品主图)
	ImageURL  string          `json:"image_url" gorm:"size:512;comment:规格图URL"`
	base.BaseModel
}

func (CrmProductSku) TableName() string { return "crm_product_sku" }
