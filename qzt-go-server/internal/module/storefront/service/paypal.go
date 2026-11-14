package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"qzt-go-server/config"
	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/pkg/paypal"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// paypal.go 独立站第二支付通道 PayPal(P28-C)。
// 下单:复用 prepareOrder 落单(币种校验/价格折算/快照一致)→ PayPal Orders API v2
// 创建订单 → 失败同步作废订单,成功回填 paypal_order_id 并返回审批跳转地址;
// 买家在 PayPal 审批页支付后按 return_url 跳回站点 success 页(PayPal 自动追加
// token=<PayPal 订单 ID> query,无需占位符),站点页调 capture 服务端确认扣款。
// capture 幂等:与 Stripe webhook 共用 markOrderPaid(仅待支付单生效)+ finalizePaidOrder 收尾。

// PayPalCheckoutRequest 公开 PayPal 下单请求(binding 同 CheckoutRequest)。
type PayPalCheckoutRequest struct {
	// Items 明细(1-20 行)
	Items []CheckoutItemRequest `json:"items" binding:"required,min=1,max=20,dive"`
	// 站点语言(en/zh,空默认 en)
	Locale string `json:"locale" binding:"max=8"`
	// 结算币种(ISO 4217,空默认 USD;必须存在于汇率表)
	Currency string `json:"currency" binding:"max=8"`
}

// PayPalCreateResult PayPal 下单结果:订单号 + PayPal 订单 ID + 审批页地址。
type PayPalCreateResult struct {
	// 平台订单号(storefront_order.order_no)
	OrderNo string `json:"order_no"`
	// PayPal 订单 ID(回调 capture 用)
	PaypalOrderID string `json:"paypal_order_id"`
	// 买家审批支付页地址(前端跳转/弹窗)
	ApproveURL string `json:"approve_url"`
}

// PayPalCaptureRequest PayPal 支付确认请求(站点 success 页回跳后调用)。
type PayPalCaptureRequest struct {
	// PayPal 订单 ID(审批回跳 query 的 token 参数)
	PaypalOrderID string `json:"paypal_order_id" binding:"required"`
}

// PayPalCaptureResult PayPal 支付确认结果。
type PayPalCaptureResult struct {
	// 平台订单号
	OrderNo string `json:"order_no"`
	// 推进后的订单状态(paid)
	Status string `json:"status"`
}

// paypalClient 按当前配置构造 PayPal 客户端(凭据走 .env 注入)。
func paypalClient() *paypal.Client {
	cfg := config.Get().Paypal
	return paypal.NewClient(cfg.Env, cfg.ClientID, cfg.Secret)
}

// paypalRedirectURL 由 PayPal 站点根 + locale + 相对路径拼审批回跳地址。
func paypalRedirectURL(locale, tail string) string {
	site := strings.TrimRight(config.Get().Paypal.StorefrontSiteURL, "/")
	if site == "" {
		site = "http://localhost:5177"
	}
	return fmt.Sprintf("%s/%s/%s", site, locale, tail)
}

// CreatePayPalCheckout 公开 PayPal 下单:prepareOrder 落单(内含频控/币种校验)
// → PayPal 创建订单 → 失败作废(同 Stripe)→ 回填 paypal_order_id。
// 频控只在 prepareOrder 扣一次(本函数不重复扣,避免同 IP 限额实际减半)。
func (s *CheckoutService) CreatePayPalCheckout(ctx context.Context, ip string, req *PayPalCheckoutRequest) (*PayPalCreateResult, error) {
	// 归一(locale/Currency)在 prepareOrder 内完成,unsupported currency 亦在该层拒绝
	ckReq := &CheckoutRequest{Items: req.Items, Locale: req.Locale, Currency: req.Currency}
	order, _, err := s.prepareOrder(ctx, ip, ckReq)
	if err != nil {
		return nil, err
	}
	orderNo := order.OrderNo

	// PayPal 订单:总额制单 purchase_unit;return_url 无需占位符——
	// 审批完成跳回时 PayPal 自动追加 &token=<PayPal 订单 ID> query,success 页读 token 即可
	ppOrder, err := paypalClient().CreateOrder(ctx, &paypal.OrderParams{
		Amount:      order.TotalAmount.InexactFloat64(),
		Currency:    order.Currency,
		OrderNo:     orderNo,
		Description: "Xingjian Store order " + orderNo,
		ReturnURL:   paypalRedirectURL(ckReq.Locale, "checkout/success?pp=1"),
		CancelURL:   paypalRedirectURL(ckReq.Locale, "cart?canceled=1"),
	})
	if err != nil {
		xlogger.ErrorfCtx(ctx, "独立站 PayPal 订单创建失败 order=%s: %v", orderNo, err)
		// PayPal 侧失败(未配置/网络/拒单):同步作废订单,不留悬挂待支付单污染列表
		order.Status = sfmodel.OrderStatusCancelled
		if uerr := s.orderRepo.Update(ctx, order, "status"); uerr != nil {
			xlogger.ErrorfCtx(ctx, "独立站订单作废失败 order=%s: %v", orderNo, uerr)
		}
		return nil, err
	}
	// 回填 PayPal 订单 ID(指针字段非 nil 才更新,同 session id 回填口径)
	ppID := ppOrder.ID
	order.PaypalOrderID = &ppID
	if err := s.orderRepo.Update(ctx, order, "paypal_order_id"); err != nil {
		xlogger.ErrorfCtx(ctx, "独立站订单回填 PayPal 订单 ID 失败 order=%s: %v", orderNo, err)
		return nil, errors.New("下单失败,请稍后重试")
	}
	return &PayPalCreateResult{
		OrderNo:       orderNo,
		PaypalOrderID: ppOrder.ID,
		ApproveURL:    ppOrder.ApproveURL,
	}, nil
}

// CapturePayPal PayPal 支付确认(服务端捕获扣款):按 paypal_order_id 查待支付单
// → CaptureOrder → COMPLETED 幂等置已支付(回填买家/捕获交易 ID/paid_at)+ finalizePaidOrder。
// 捕获失败订单保持待支付,前端可重试。
func (s *CheckoutService) CapturePayPal(ctx context.Context, ip string, req *PayPalCaptureRequest) (*PayPalCaptureResult, error) {
	if !s.rateLimitOK(ctx, ip) {
		return nil, errors.New("操作过于频繁,请稍后再试")
	}
	id := strings.TrimSpace(req.PaypalOrderID)

	var order sfmodel.StorefrontOrder
	if err := repository.DBFrom(ctx).
		Where("paypal_order_id = ?", id).
		First(&order).Error; err != nil {
		return nil, errors.New("订单不存在")
	}
	if order.Status != sfmodel.OrderStatusPending {
		return nil, errors.New("订单状态不允许支付确认")
	}

	res, err := paypalClient().CaptureOrder(ctx, id, order.OrderNo)
	if err != nil {
		// 捕获失败透传错误(订单留待支付,前端可重试)
		return nil, err
	}
	if res.CaptureStatus != "COMPLETED" {
		xlogger.ErrorfCtx(ctx, "独立站 PayPal 捕获未完成 order=%s status=%s capture=%s", order.OrderNo, res.CaptureStatus, res.CaptureID)
		return nil, fmt.Errorf("PayPal 扣款未完成(%s),请稍后重试", res.CaptureStatus)
	}

	// 回填买家信息;payment_intent_id 列存 PayPal 捕获交易 ID(语义近似,对账用)
	ok, err := s.markOrderPaid(ctx, order.OrderNo, map[string]any{
		"customer_email":    res.BuyerEmail,
		"customer_name":     res.BuyerName,
		"customer_country":  res.CountryCode,
		"payment_intent_id": res.CaptureID, // PayPal 捕获交易 ID(Stripe 场景为 Payment Intent)
		"paid_at":           time.Now(),
	})
	if err != nil {
		return nil, err
	}
	if ok {
		// 本次调用实际推进:重载订单并收尾(通知+邮件+best-effort PSI)
		reloaded, gerr := s.orderRepo.GetByOrderNo(ctx, order.OrderNo)
		if gerr != nil {
			xlogger.ErrorfCtx(ctx, "独立站 PayPal 支付后回查失败 order=%s: %v", order.OrderNo, gerr)
		} else {
			s.finalizePaidOrder(ctx, reloaded)
		}
	}
	// ok=false = 并发已付(幂等),同样返回成功
	return &PayPalCaptureResult{OrderNo: order.OrderNo, Status: "paid"}, nil
}
