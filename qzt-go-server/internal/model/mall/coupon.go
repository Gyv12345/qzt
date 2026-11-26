package mall

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// coupon.go 商城优惠券。mall_coupon 为券模板(管理员维护),买家领取后生成
// mall_user_coupon 券实例(唯一券码),下单核销、取消回退。

// 券模板状态。
const (
	CouponStatusEnabled  int8 = 1 // 启用
	CouponStatusDisabled int8 = 2 // 停用(买家不可领不可用)
)

// 买家券实例状态。
const (
	UserCouponStatusUnused  int8 = 1 // 未使用
	UserCouponStatusUsed    int8 = 2 // 已使用
	UserCouponStatusExpired int8 = 3 // 已过期
)

// MallCoupon 优惠券模板。
type MallCoupon struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 券名
	Name string `json:"name" gorm:"size:64;not null;comment:券名"`
	// 满 X 元可用(0=无门槛)
	Threshold decimal.Decimal `json:"threshold" gorm:"type:decimal(14,2);not null;default:0;comment:满X可用(0=无门槛)"`
	// 抵扣金额
	Discount decimal.Decimal `json:"discount" gorm:"type:decimal(14,2);not null;comment:抵扣金额"`
	// 发放总量
	TotalCount int `json:"total_count" gorm:"not null;default:0;comment:发放总量"`
	// 已领取数量
	Claimed int `json:"claimed" gorm:"not null;default:0;comment:已领取数"`
	// 每人限领张数(含已用)
	PerUserLimit int `json:"per_user_limit" gorm:"not null;default:1;comment:每人限领"`
	// 领取+使用窗口(NULL=不限)
	StartAt xtime.NullDateTime `json:"start_at" gorm:"type:datetime(3);comment:生效开始(NULL=立即)"`
	EndAt   xtime.NullDateTime `json:"end_at" gorm:"type:datetime(3);comment:生效结束(NULL=长期)"`
	// 1启用 2停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 2停用"`
	base.BaseModel
}

func (MallCoupon) TableName() string { return "mall_coupon" }

// MallUserCoupon 买家持有的券实例。
type MallUserCoupon struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 买家ID(mall_user)
	UserID uint `json:"user_id" gorm:"not null;index:idx_user_coupon_user;comment:买家ID(mall_user)"`
	// 券模板ID
	CouponID uint `json:"coupon_id" gorm:"not null;index;comment:券模板ID"`
	// 唯一券码(C+yyyyMMdd+6位随机大写字母数字)
	CouponNo string `json:"coupon_no" gorm:"size:32;not null;uniqueIndex:uk_user_coupon_no;comment:唯一券码"`
	// 1未使用 2已使用 3已过期
	Status int8 `json:"status" gorm:"not null;default:1;comment:1未使用 2已使用 3已过期"`
	// 核销订单号
	UsedOrderNo string `json:"used_order_no" gorm:"size:40;not null;default:'';comment:核销订单号"`
	// 核销时间
	UsedAt xtime.NullDateTime `json:"used_at" gorm:"type:datetime(3);comment:核销时间"`
	base.BaseModel
}

func (MallUserCoupon) TableName() string { return "mall_user_coupon" }
