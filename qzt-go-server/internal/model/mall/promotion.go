package mall

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// promotion.go 商城限时特价。活动挂在 crm_product 维度,同商品允许多条
// 历史活动(无唯一约束);生效价统一取「当前时间窗内 status=1 的最低 promo_price」,
// 由服务端权威应用(公开 DTO 展示 + 下单计价覆盖),不信任客户端价格。

// 活动状态。
const (
	PromotionStatusEnabled  int8 = 1 // 启用
	PromotionStatusDisabled int8 = 2 // 停用
)

// MallPromotion 限时特价活动。
type MallPromotion struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 活动名
	Name string `json:"name" gorm:"size:64;not null;comment:活动名"`
	// 商品ID(crm_product)
	ProductID uint `json:"product_id" gorm:"not null;index:idx_promotion_product;comment:商品ID(crm_product)"`
	// 活动价(限时特价)
	PromoPrice decimal.Decimal `json:"promo_price" gorm:"type:decimal(14,2);not null;comment:活动价"`
	// 活动开始时间
	StartAt xtime.DateTime `json:"start_at" gorm:"type:datetime(3);not null;comment:开始时间"`
	// 活动结束时间
	EndAt xtime.DateTime `json:"end_at" gorm:"type:datetime(3);not null;comment:结束时间"`
	// 1启用 2停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 2停用"`
	base.BaseModel
}

func (MallPromotion) TableName() string { return "mall_promotion" }
