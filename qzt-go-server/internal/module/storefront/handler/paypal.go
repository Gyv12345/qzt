package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/storefront/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// PayPalHandler 独立站 PayPal 支付 handler(均免登,P28-C 第二支付通道)。
// 只依赖 service,paypal 包仅允许 service 层 import。
type PayPalHandler struct {
	svc *service.CheckoutService
}

// NewPayPalHandler 构造。
func NewPayPalHandler() *PayPalHandler {
	return &PayPalHandler{svc: service.NewCheckoutService()}
}

// PublicCreatePayPal PayPal 下单
// @Summary  独立站 PayPal 下单(公开)
// @Description  免登录下单:每 IP 每分钟限 5 次;校验商品可购并统一折算到结算币种后创建订单快照,再调 PayPal Orders API 创建支付订单,返回买家审批页地址(approve_url)。PayPal 凭据未配置时返回「PayPal 支付未配置」;买家在 PayPal 审批完成后跳回站点 success 页(query 带 token=<PayPal 订单 ID>),前端再调 /storefront/public/paypal/capture 确认扣款
// @Tags     独立站公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.PayPalCheckoutRequest  true  "下单内容(items + locale + currency)"
// @Success  200  {object}  xresponse.Response{data=service.PayPalCreateResult}
// @Router   /storefront/public/paypal/create [post]
func (h *PayPalHandler) PublicCreatePayPal(c *gin.Context) {
	var req service.PayPalCheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "下单参数不正确")
		return
	}
	result, err := h.svc.CreatePayPalCheckout(c.Request.Context(), c.ClientIP(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// PublicCapturePayPal PayPal 支付确认
// @Summary  独立站 PayPal 支付确认(公开)
// @Description  免登录服务端捕获:按 paypal_order_id 定位待支付订单并调 PayPal Capture 确认扣款;COMPLETED 幂等置已支付(回填买家/捕获交易 ID/paid_at,通知+邮件+best-effort PSI 销售单)。订单非待支付返回错误提示,捕获失败订单保持待支付可重试
// @Tags     独立站公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.PayPalCaptureRequest  true  "PayPal 订单 ID(审批回跳 query 的 token 参数)"
// @Success  200  {object}  xresponse.Response{data=service.PayPalCaptureResult}
// @Router   /storefront/public/paypal/capture [post]
func (h *PayPalHandler) PublicCapturePayPal(c *gin.Context) {
	var req service.PayPalCaptureRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "PayPal 订单 ID 不能为空")
		return
	}
	result, err := h.svc.CapturePayPal(c.Request.Context(), c.ClientIP(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}
