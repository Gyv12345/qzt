package crm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// product.go CRM 商品 + 多价格。

// 商品状态。
const (
	ProductStatusOn  int8 = 1 // 上架
	ProductStatusOff int8 = 2 // 下架
)

// CrmProduct CRM 商品。
type CrmProduct struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	Name          string          `json:"name" gorm:"size:255;index;not null;comment:产品名称"`
	ProductNo     string          `json:"product_no" gorm:"size:64;comment:产品编号"`
	Category      string          `json:"category" gorm:"size:64;index;comment:分类(字典PRODUCT_CATEGORY)"`
	Unit          string          `json:"unit" gorm:"size:20;comment:单位"`
	StandardPrice decimal.Decimal `json:"standard_price" gorm:"type:decimal(14,2);comment:标准价格"`
	CostPrice     decimal.Decimal `json:"cost_price" gorm:"type:decimal(14,2);comment:成本价"`
	Status        int8            `json:"status" gorm:"default:1;index;comment:1上架 2下架"`
	Description   string          `json:"description" gorm:"type:text;comment:描述"`
	base.BaseModel
}

func (CrmProduct) TableName() string { return "crm_product" }

// CrmProductPrice 商品多价格(按价格类型区分,如 VIP/普通/大客户/促销)。
type CrmProductPrice struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	ProductID   uint            `json:"product_id" gorm:"index;uniqueIndex:uk_product_type;not null;comment:产品ID"`
	PriceType   string          `json:"price_type" gorm:"size:32;uniqueIndex:uk_product_type;not null;comment:价格类型(字典PRODUCT_PRICE_TYPE)"`
	Price       decimal.Decimal `json:"price" gorm:"type:decimal(14,2);not null;comment:价格"`
	MinQuantity *int            `json:"min_quantity" gorm:"comment:起购数量"`
	Remark      string          `json:"remark" gorm:"size:200"`
	base.BaseModel
}

func (CrmProductPrice) TableName() string { return "crm_product_price" }
