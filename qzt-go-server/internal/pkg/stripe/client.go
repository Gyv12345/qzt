// Package stripe Stripe 支付客户端(P28-B 跨境独立站支付闭环)。
//
// 不引入官方 SDK,仅用 net/http + form-encoded 直调 Stripe REST API,
// 只封装独立站 Checkout 需要的最小面:创建 Checkout Session、Webhook 验签、
// 事件解析。密钥只走 gitignored .env(STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET),
// 留空即未配置——CreateCheckoutSession 返回 ErrNotConfigured,调用方走明确报错。
//
// Test Mode 优先:secret key 形如 sk_test_...,webhook secret 形如 whsec_...。
package stripe

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ErrNotConfigured 密钥未配置(支付通道未开通)。调用方应原样透出该错误文案。
var ErrNotConfigured = errors.New("支付通道未配置")

// apiBaseURL Stripe REST API 根地址。
const apiBaseURL = "https://api.stripe.com"

// signatureToleranceSeconds Webhook 时间戳容差(Stripe 官方建议 5 分钟)。
const signatureToleranceSeconds = 300

// httpTimeout 单次 HTTP 调用超时。
const httpTimeout = 30 * time.Second

// Client Stripe 客户端。
type Client struct {
	// SecretKey 密钥(sk_test_... / sk_live_...),空=未配置。
	SecretKey string
	// HTTPClient 可注入的 HTTP 客户端(测试用);nil 时用默认(30s 超时)。
	HTTPClient *http.Client
}

// NewClient 构造。
func NewClient(secretKey string) *Client {
	return &Client{SecretKey: secretKey}
}

// Enabled 是否已配置密钥。
func (c *Client) Enabled() bool { return c != nil && c.SecretKey != "" }

// LineItem Checkout Session 明细项。
type LineItem struct {
	// ProductName 商品名(快照,进 Stripe product_data.name)
	ProductName string
	// Currency ISO 4217 币种(如 USD,大小写均可,发送前转小写)
	Currency string
	// UnitAmount 单价(主单位,如 19.99;内部换算为分)
	UnitAmount float64
	// Quantity 数量(≥1)
	Quantity int64
}

// CheckoutSessionParams 创建 Checkout Session 参数。
type CheckoutSessionParams struct {
	// Items 明细(至少一条)
	Items []LineItem
	// SuccessURL 支付成功跳转(含 {CHECKOUT_SESSION_ID} 占位符)
	SuccessURL string
	// CancelURL 取消跳转
	CancelURL string
	// CustomerEmail 预填邮箱(可选,空则由买家在 Stripe 页填写)
	CustomerEmail string
	// Metadata 附加元数据(必带 order_no 供 webhook 回查订单)
	Metadata map[string]string
}

// CheckoutSession 创建成功的 Session(id+收银台 URL)。
type CheckoutSession struct {
	// ID Session ID(cs_test_... / cs_live_...)
	ID string `json:"id"`
	// URL Stripe 托管收银台地址(前端跳转用)
	URL string `json:"url"`
}

// CreateCheckoutSession 创建 Checkout Session(mode=payment)。
// 密钥未配置时返回 ErrNotConfigured(「支付通道未配置」)。
func (c *Client) CreateCheckoutSession(ctx context.Context, p *CheckoutSessionParams) (*CheckoutSession, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	if p == nil || len(p.Items) == 0 {
		return nil, errors.New("订单明细不能为空")
	}
	if p.SuccessURL == "" || p.CancelURL == "" {
		return nil, errors.New("success_url/cancel_url 不能为空")
	}

	form := url.Values{}
	form.Set("mode", "payment")
	form.Set("success_url", p.SuccessURL)
	form.Set("cancel_url", p.CancelURL)
	if p.CustomerEmail != "" {
		form.Set("customer_email", p.CustomerEmail)
	}
	for k, v := range p.Metadata {
		form.Set("metadata["+k+"]", v)
	}
	for i, it := range p.Items {
		cents, err := toCents(it.UnitAmount)
		if err != nil {
			return nil, fmt.Errorf("商品「%s」金额无效: %w", it.ProductName, err)
		}
		prefix := fmt.Sprintf("line_items[%d]", i)
		form.Set(prefix+"[quantity]", strconv.FormatInt(it.Quantity, 10))
		form.Set(prefix+"[price_data][currency]", strings.ToLower(it.Currency))
		form.Set(prefix+"[price_data][unit_amount]", strconv.FormatInt(cents, 10))
		form.Set(prefix+"[price_data][product_data][name]", it.ProductName)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBaseURL+"/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.SecretKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	session := &CheckoutSession{}
	if err := c.doJSON(req, session); err != nil {
		return nil, err
	}
	return session, nil
}

// doJSON 执行请求并把 2xx 响应 JSON 解进 out;非 2xx 抽取 Stripe 错误 message。
func (c *Client) doJSON(req *http.Request, out any) error {
	client := c.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: httpTimeout}
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("stripe 请求失败: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("stripe 响应读取失败: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("stripe 返回 %d: %s", resp.StatusCode, stripeErrorMessage(body))
	}
	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("stripe 响应解析失败: %w", err)
	}
	return nil
}

// stripeErrorMessage 从 Stripe 错误响应体抽取 message(解析失败回退原文截断)。
func stripeErrorMessage(body []byte) string {
	var e struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &e); err == nil && e.Error.Message != "" {
		return e.Error.Message
	}
	s := string(body)
	if len(s) > 200 {
		s = s[:200]
	}
	return s
}

// VerifyWebhookSignature 校验 Stripe-Signature 头:
// 解析 t(时间戳)与 v1(签名,可多个,任一匹配即通过),对 "{t}.{payload}" 做
// HMAC-SHA256,恒时比较;时间戳距当前超过 300 秒拒绝(防重放)。
func VerifyWebhookSignature(payload []byte, sigHeader, secret string) error {
	if sigHeader == "" || secret == "" {
		return errors.New("缺少签名头或密钥")
	}
	var timestamp string
	signatures := make([]string, 0, 2)
	for _, part := range strings.Split(sigHeader, ",") {
		part = strings.TrimSpace(part)
		k, v, found := strings.Cut(part, "=")
		if !found {
			continue
		}
		switch strings.TrimSpace(k) {
		case "t":
			timestamp = strings.TrimSpace(v)
		case "v1":
			signatures = append(signatures, strings.TrimSpace(v))
		}
	}
	if timestamp == "" || len(signatures) == 0 {
		return errors.New("签名头格式不正确")
	}

	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return errors.New("签名时间戳无效")
	}
	if d := time.Since(time.Unix(ts, 0)); d > signatureToleranceSeconds*time.Second || d < -signatureToleranceSeconds*time.Second {
		return errors.New("签名已过期")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(payload)
	expected := mac.Sum(nil)
	for _, sig := range signatures {
		got, err := hex.DecodeString(sig)
		if err != nil {
			continue // 非法 hex 直接视作不匹配
		}
		if hmac.Equal(expected, got) {
			return nil
		}
	}
	return errors.New("签名校验失败")
}

// WebhookEvent 最小事件解析:type + data.object 中 Checkout Session 相关字段。
type WebhookEvent struct {
	// Type 事件类型,如 checkout.session.completed / checkout.session.expired
	Type string `json:"type"`
	Data struct {
		Object struct {
			// ID Checkout Session ID
			ID string `json:"id"`
			// PaymentIntent 支付意向 ID(完成支付才有)
			PaymentIntent   string `json:"payment_intent"`
			CustomerDetails struct {
				Email   string `json:"email"`
				Name    string `json:"name"`
				Address struct {
					Country string `json:"country"`
				} `json:"address"`
			} `json:"customer_details"`
			// Metadata 创建 Session 时附带的元数据(必含 order_no)
			Metadata map[string]string `json:"metadata"`
		} `json:"object"`
	} `json:"data"`
}

// OrderNo 事件里的业务订单号(metadata.order_no)。
func (e *WebhookEvent) OrderNo() string {
	if e == nil || e.Data.Object.Metadata == nil {
		return ""
	}
	return e.Data.Object.Metadata["order_no"]
}

// ParseWebhookEvent 解析 webhook 原始 payload 为最小事件。
func ParseWebhookEvent(payload []byte) (*WebhookEvent, error) {
	ev := &WebhookEvent{}
	if err := json.Unmarshal(payload, ev); err != nil {
		return nil, fmt.Errorf("事件解析失败: %w", err)
	}
	return ev, nil
}

// toCents 主单位金额 → 分(四舍五入;负数/超界报错)。
func toCents(amount float64) (int64, error) {
	if amount <= 0 {
		return 0, errors.New("金额必须大于 0")
	}
	cents := int64(amount*100 + 0.5)
	if cents <= 0 || cents > 99999999 {
		return 0, errors.New("金额超出允许范围")
	}
	return cents, nil
}
