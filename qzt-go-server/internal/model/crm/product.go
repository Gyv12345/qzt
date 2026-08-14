package crm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// product.go CRM 商品。

// 商品状态。
const (
	ProductStatusOn  int8 = 1 // 上架
	ProductStatusOff int8 = 2 // 下架
)

// CrmProduct CRM 商品。
type CrmProduct struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	// 产品名称
	Name          string          `json:"name" gorm:"size:255;index;not null;comment:产品名称"`
	// 产品编号
	ProductNo     string          `json:"product_no" gorm:"size:64;comment:产品编号"`
	// 分类(字典PRODUCT_CATEGORY)
	Category      string          `json:"category" gorm:"size:64;index;comment:分类(字典PRODUCT_CATEGORY)"`
	// 单位
	Unit          string          `json:"unit" gorm:"size:20;comment:单位"`
	// 标准价格
	StandardPrice decimal.Decimal `json:"standard_price" gorm:"type:decimal(14,2);comment:标准价格"`
	// 成本价
	CostPrice     decimal.Decimal `json:"cost_price" gorm:"type:decimal(14,2);comment:成本价"`
	// 1上架 2下架
	Status        int8            `json:"status" gorm:"default:1;index;comment:1上架 2下架"`
	// 商品主图URL
	ImageURL      string          `json:"image_url" gorm:"size:512;comment:商品主图URL"`
	// 描述
	Description   string          `json:"description" gorm:"type:text;comment:描述"`
	base.BaseModel
}

func (CrmProduct) TableName() string { return "crm_product" }

