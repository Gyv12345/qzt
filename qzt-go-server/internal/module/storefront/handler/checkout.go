package handler

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/storefront/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// CheckoutHandler 独立站下单 + Stripe webhook handler(均免登)。
type CheckoutHandler struct {
	svc *service.CheckoutService
}

// NewCheckoutHandler 构造。
func NewCheckoutHandler() *CheckoutHandler {
	return &CheckoutHandler{svc: service.NewCheckoutService()}
}

// PublicCheckout 公开下单
// @Summary  独立站下单(公开)
// @Description  免登录下单:每 IP 每分钟限 5 次;校验商品可购并按上架位价格规则快照,创建 Stripe Checkout Session(Test Mode);密钥未配置时返回「支付通道未配置」
// @Tags     独立站公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.CheckoutRequest  true  "下单内容(items + locale)"
// @Success  200  {object}  xresponse.Response{data=service.CheckoutResult}
// @Router   /storefront/public/checkout [post]
func (h *CheckoutHandler) PublicCheckout(c *gin.Context) {
	var req service.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "下单参数不正确")
		return
	}
	result, err := h.svc.CreateCheckout(c.Request.Context(), c.ClientIP(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// StripeWebhook Stripe 事件回调
// @Summary  Stripe webhook 回调(公开)
// @Description  免登录接收 Stripe 事件:Stripe-Signature 验签失败返回 400;checkout.session.completed 幂等置已支付(回填买家信息并通知+生成 PSI 销售单),checkout.session.expired 置已过期
// @Tags     独立站公开
// @Accept   json
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/public/webhooks/stripe [post]
func (h *CheckoutHandler) StripeWebhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil || len(payload) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求体为空"})
		return
	}
	if err := h.svc.HandleStripeWebhook(c.Request.Context(), payload, c.GetHeader("Stripe-Signature")); err != nil {
		// 验签失败/事件异常必须回真实 HTTP 400(xresponse.Fail 是 200 信封,
		// Stripe 只按 HTTP 状态码决定重试),由 Stripe 按策略重投
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	response.OK(c, gin.H{"received": true})
}
