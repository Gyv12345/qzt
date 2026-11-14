package storefront

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// storefront.go 跨境独立站(storefront)域:P28 跨境独立站体系。
// 商品本体复用 crm_product/crm_product_sku;本域只存「上架位 + 多语言翻译 + 询盘」。
// 价格模型:USD 直标价优先(storefront_product.price + currency),否则按汇率
// (sys_config storefront.rates,CNY per unit)由 CRM 标价(CNY)折算展示;
// 在线支付见 P28-B(Stripe Test Mode 先行)。

// 独立站商品上架状态(对齐 CRM 商品 1上架/2下架 口径)。
const (
	ProductStatusOn  int8 = 1 // 上架
	ProductStatusOff int8 = 2 // 下架
)

// 询盘状态。
const (
	// InquiryStatusNew 新询盘
	InquiryStatusNew int8 = 1
	// InquiryStatusContacted 已跟进
	InquiryStatusContacted int8 = 2
)

// StorefrontProduct 独立站商品上架位。
type StorefrontProduct struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 关联 CRM 商品(crm_product)
	ProductID uint `json:"product_id" gorm:"index;not null;comment:关联CRM商品ID"`
	// URL 别名(独立站详情页 /{locale}/products/:slug,英文小写+连字符;
	// 唯一索引+软删陷阱:上架位删除后重挂同一 slug 前,service 层须 Unscoped 清理旧行)
	Slug string `json:"slug" gorm:"size:128;not null;default:'';uniqueIndex:uk_sf_product_slug;comment:URL别名"`
	// 1上架 2下架
	Status int8 `json:"status" gorm:"default:1;index;comment:1上架 2下架"`
	// 排序值(小在前)
	Sort int `json:"sort" gorm:"default:0;comment:排序值"`
	// 直标价(站点币种;NULL=按汇率由 CRM 标价折算)
	Price *decimal.Decimal `json:"price" gorm:"type:decimal(14,2);comment:直标价(站点币种,NULL=CRM标价×汇率)"`
	// 直标价币种(ISO 4217,默认 USD)
	Currency string `json:"currency" gorm:"size:3;not null;default:'USD';comment:直标价币种"`
	// 精选(首页精选区块,sort 升序取前 N)
	Featured bool `json:"featured" gorm:"default:false;comment:首页精选"`
	base.BaseModel
}

func (StorefrontProduct) TableName() string { return "storefront_product" }

// StorefrontProductI18n 独立站商品多语言翻译((product, locale) 唯一)。
type StorefrontProductI18n struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 上架位ID(storefront_product)
	StorefrontProductID uint `json:"storefront_product_id" gorm:"uniqueIndex:uk_sf_i18n;not null;comment:上架位ID"`
	// 语言代码(en/zh)
	Locale string `json:"locale" gorm:"size:8;uniqueIndex:uk_sf_i18n;not null;comment:语言代码"`
	// 商品名(该语言)
	Name string `json:"name" gorm:"size:255;not null;default:'';comment:商品名"`
	// 一句话卖点(该语言)
	Summary string `json:"summary" gorm:"size:500;not null;default:'';comment:一句话卖点"`
	// 富文本/Markdown 介绍(该语言)
	Description string `json:"description" gorm:"type:text;comment:详细介绍"`
	base.BaseModel
}

func (StorefrontProductI18n) TableName() string { return "storefront_product_i18n" }

// StorefrontInquiry 独立站询盘(B2B 转化动作:询价→CRM 公海线索)。
type StorefrontInquiry struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 询盘人姓名
	Name string `json:"name" gorm:"size:64;not null;default:'';comment:询盘人姓名"`
	// 邮箱(独立站主联系渠道)
	Email string `json:"email" gorm:"size:100;index;comment:邮箱"`
	// 公司名
	Company string `json:"company" gorm:"size:128;not null;default:'';comment:公司名"`
	// 国家/地区
	Country string `json:"country" gorm:"size:64;not null;default:'';comment:国家地区"`
	// 询盘内容
	Message string `json:"message" gorm:"type:text;comment:询盘内容"`
	// 关联商品(可空=通用询盘)
	ProductID *uint `json:"product_id" gorm:"comment:关联上架商品ID"`
	// 提交时语言
	Locale string `json:"locale" gorm:"size:8;not null;default:'en';comment:提交语言"`
	// 提交 IP(频控+溯源)
	IP string `json:"ip" gorm:"size:45;not null;default:'';comment:提交IP"`
	// 1新询盘 2已跟进
	Status int8 `json:"status" gorm:"default:1;index;comment:1新询盘 2已跟进"`
	// 转化出的 CRM 线索编号(回填)
	LeadNo string `json:"lead_no" gorm:"size:64;not null;default:'';comment:CRM线索编号"`
	base.BaseModel
}

func (StorefrontInquiry) TableName() string { return "storefront_inquiry" }
