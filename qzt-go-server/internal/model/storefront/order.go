package storefront

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// order.go 独立站订单域(P28-B Stripe 支付闭环,Test Mode 先行)。
// 订单由公开 checkout 接口创建(免登,价格快照),Stripe Checkout Session 托管收银,
// webhook 回调推进状态:completed→已支付(回填客户/PI/paid_at,通知+best-effort PSI 销售单),
// expired→已过期。商品本体仍复用 crm_product,订单只存下单快照。

// 订单状态(与文档/前端约定一致)。
const (
	// OrderStatusPending 待支付(checkout 成功,尚未回调)
	OrderStatusPending int8 = 1
	// OrderStatusPaid 已支付(webhook checkout.session.completed)
	OrderStatusPaid int8 = 2
	// OrderStatusCancelled 已取消(预留,当前无人工取消入口)
	OrderStatusCancelled int8 = 3
	// OrderStatusExpired 已过期(webhook checkout.session.expired)
	OrderStatusExpired int8 = 4
)

// StorefrontOrder 独立站订单主单。
type StorefrontOrder struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 订单号(SF+yyyyMMdd+序号,numbergen 生成,唯一)
	OrderNo string `json:"order_no" gorm:"size:40;not null;default:'';uniqueIndex:uk_sf_order_no;comment:订单号"`
	// 1待支付 2已支付 3已取消 4已过期
	Status int8 `json:"status" gorm:"default:1;index;comment:1待支付 2已支付 3已取消 4已过期"`
	// 结算币种(ISO 4217,默认 USD)
	Currency string `json:"currency" gorm:"size:3;not null;default:'USD';comment:币种"`
	// 订单总额(主单位)
	TotalAmount decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);comment:订单总额"`
	// 买家邮箱(webhook 完成后回填 Stripe customer_details.email)
	CustomerEmail string `json:"customer_email" gorm:"size:200;not null;default:'';comment:买家邮箱"`
	// 买家姓名(同上,回填)
	CustomerName string `json:"customer_name" gorm:"size:200;not null;default:'';comment:买家姓名"`
	// 买家国家/地区(同上,回填 address.country)
	CustomerCountry string `json:"customer_country" gorm:"size:100;not null;default:'';comment:买家国家地区"`
	// Stripe Checkout Session ID(创建后回填;可空:下单到回调前为 NULL,
	// 唯一索引不拦多条 NULL)
	StripeSessionID *string `json:"stripe_session_id" gorm:"size:255;uniqueIndex:uk_sf_order_session;comment:Stripe Checkout Session ID"`
	// PayPal 订单 ID(P28-C 第二支付通道;创建后回填;可空,唯一索引不拦多条 NULL)
	PaypalOrderID *string `json:"paypal_order_id" gorm:"size:64;uniqueIndex:uk_sf_order_paypal;comment:PayPal 订单 ID"`
	// Stripe Payment Intent ID(支付完成后回填)
	PaymentIntentID string `json:"payment_intent_id" gorm:"size:255;not null;default:'';comment:Stripe Payment Intent ID"`
	// 关联 PSI 销售单号(best-effort 生成后回填)
	PsiOrderNo string `json:"psi_order_no" gorm:"size:40;not null;default:'';comment:PSI销售单号"`
	// 下单时站点语言
	Locale string `json:"locale" gorm:"size:10;not null;default:'en';comment:站点语言"`
	// 下单 IP(频控+溯源)
	IP string `json:"ip" gorm:"size:64;not null;default:'';comment:下单IP"`
	// 支付完成时间(webhook 回填)
	PaidAt xtime.NullDateTime `json:"paid_at" gorm:"type:datetime;comment:支付完成时间"`
	base.BaseModel
}

func (StorefrontOrder) TableName() string { return "storefront_order" }

// StorefrontOrderItem 独立站订单明细(下单价格快照,不随商品改价变化)。
type StorefrontOrderItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 订单ID(storefront_order)
	OrderID uint `json:"order_id" gorm:"index;not null;comment:订单ID"`
	// CRM 商品ID
	ProductID uint `json:"product_id" gorm:"not null;comment:CRM商品ID"`
	// 商品名(下单快照)
	ProductName string `json:"product_name" gorm:"size:200;not null;default:'';comment:商品名快照"`
	// SKU 编号(独立站 checkout 不选规格,默认空)
	Sku string `json:"sku" gorm:"size:100;not null;default:'';comment:SKU编号"`
	// 数量
	Quantity int `json:"quantity" gorm:"not null;default:1;comment:数量"`
	// 单价(主单位)
	UnitAmount decimal.Decimal `json:"unit_amount" gorm:"type:decimal(14,2);comment:单价"`
	// 小计 = 单价×数量
	Amount    decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);comment:小计"`
	CreatedAt xtime.DateTime  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (StorefrontOrderItem) TableName() string { return "storefront_order_item" }

// OrderStatusLabel 订单状态中文。
func OrderStatusLabel(status int8) string {
	switch status {
	case OrderStatusPending:
		return "待支付"
	case OrderStatusPaid:
		return "已支付"
	case OrderStatusCancelled:
		return "已取消"
	case OrderStatusExpired:
		return "已过期"
	}
	return "未知"
}
