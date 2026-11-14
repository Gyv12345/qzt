// Package paypal PayPal 支付客户端(P28-C 跨境独立站第二支付通道)。
//
// 不引入官方 SDK,仅用 net/http + JSON 直调 PayPal Orders REST API v2:
// 创建订单(买家用 PayPal 账号审批支付)、捕获(服务端确认扣款)。
// 凭据注册 PayPal 开发者账号后填 .env(PAYPAL_CLIENT_ID / PAYPAL_SECRET),
// 留空即未配置,下单返回「PayPal 支付未配置」,不影响 Stripe 通道。
// env 选 sandbox / live 的 API 根地址,凭据本身不区分环境。
package paypal

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ErrNotConfigured 凭据未配置。调用方原样透出该文案。
var ErrNotConfigured = errors.New("PayPal 支付未配置")

// API 根地址(按 env 选择)。
const (
	apiSandbox = "https://api-m.sandbox.paypal.com"
	apiLive    = "https://api-m.paypal.com"
)

// httpTimeout 单次 HTTP 超时;tokenSkewSecs 到期前视为过期。
const (
	httpTimeout   = 30 * time.Second
	tokenSkewSecs = 60
)

// Client PayPal 客户端。
type Client struct {
	ClientID   string       // .env PAYPAL_CLIENT_ID,空=未配置
	Secret     string       // .env PAYPAL_SECRET,空=未配置
	Env        string       // sandbox / live,空默认 sandbox
	BaseURL    string       // 覆盖 API 根地址(仅测试注入)
	HTTPClient *http.Client // 可注入(仅测试);nil 用默认 30s 超时
	mu         sync.Mutex   // token 缓存锁
	token      string       // 缓存的 OAuth token
	tokenExp   time.Time    // 到期时刻(已扣 skew)
}

// NewClient 构造。
func NewClient(env, clientID, secret string) *Client {
	return &Client{Env: env, ClientID: clientID, Secret: secret}
}

// Enabled 是否已配置凭据。
func (c *Client) Enabled() bool {
	return c != nil && c.ClientID != "" && c.Secret != ""
}

// baseURL 按 Env 推导 API 根地址。
func (c *Client) baseURL() string {
	if c.BaseURL != "" {
		return c.BaseURL
	}
	if strings.EqualFold(c.Env, "live") {
		return apiLive
	}
	return apiSandbox
}

// tokenResponse OAuth 响应字段。
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// accessToken 取 OAuth token(client_credentials),内存缓存至到期前 60s。
func (c *Client) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	if c.token != "" && time.Now().Before(c.tokenExp) {
		tok := c.token
		c.mu.Unlock()
		return tok, nil
	}
	c.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL()+"/v1/oauth2/token",
		strings.NewReader("grant_type=client_credentials"))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(c.ClientID, c.Secret)

	var tok tokenResponse
	if err := c.doJSON(ctx, req, &tok); err != nil {
		return "", err
	}
	if tok.AccessToken == "" {
		return "", errors.New("PayPal OAuth 响应缺少 access_token")
	}
	c.mu.Lock()
	c.token = tok.AccessToken
	c.tokenExp = time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second).Add(-tokenSkewSecs * time.Second)
	c.mu.Unlock()
	return tok.AccessToken, nil
}

// apiError PayPal 业务错误(带 debug_id 便于排查)。
type apiError struct {
	Status  int
	Message string
	DebugID string
}

func (e *apiError) Error() string {
	if e.DebugID != "" {
		return fmt.Sprintf("PayPal API %d: %s (debug_id=%s)", e.Status, e.Message, e.DebugID)
	}
	return fmt.Sprintf("PayPal API %d: %s", e.Status, e.Message)
}

// doJSON 发请求并解析 JSON 响应;非 2xx 解析 message/debug_id 构造 apiError。
func (c *Client) doJSON(ctx context.Context, req *http.Request, out any) error {
	client := c.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: httpTimeout}
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("PayPal 网络请求失败: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("PayPal 响应读取失败: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var eb struct {
			Message string `json:"message"`
			DebugID string `json:"debug_id"`
		}
		_ = json.Unmarshal(body, &eb)
		return &apiError{Status: resp.StatusCode, Message: eb.Message, DebugID: eb.DebugID}
	}
	if out != nil {
		return json.Unmarshal(body, out)
	}
	return nil
}

// OrderParams 创建订单参数。
type OrderParams struct {
	Amount      float64 // 总金额(主单位,发送前格式化两位小数)
	Currency    string  // ISO 4217 币种
	OrderNo     string  // 平台订单号(custom_id 对账用)
	Description string  // 购买说明(可选)
	ReturnURL   string  // 买家支付成功跳回地址
	CancelURL   string  // 买家取消跳回地址
}

// PayPalOrder 创建订单返回。
type PayPalOrder struct {
	ID         string // PayPal 订单 ID
	ApproveURL string // 买家审批页地址
}

// orderResponse v2/checkout/orders 创建/捕获共用的响应骨架。
type orderResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Links  []struct {
		Rel  string `json:"rel"`
		Href string `json:"href"`
	} `json:"links"`
	Payer struct {
		EmailAddress string `json:"email_address"`
		Name         struct {
			GivenName string `json:"given_name"`
			Surname   string `json:"surname"`
		} `json:"name"`
		Address struct {
			CountryCode string `json:"country_code"`
		} `json:"address"`
	} `json:"payer"`
	PurchaseUnits []struct {
		Payments struct {
			Captures []struct {
				ID     string `json:"id"`
				Status string `json:"status"`
			} `json:"captures"`
		} `json:"payments"`
	} `json:"purchase_units"`
}

// CreateOrder 创建 PayPal 订单(intent=CAPTURE,单 purchase_unit 总额制)。
// 买家在 ApproveURL 完成支付授权,PayPal 按 return_url 跳回站点
// success 页(带 token=<PayPal 订单 ID>),站点页调 CaptureOrder 完成扣款。
func (c *Client) CreateOrder(ctx context.Context, p *OrderParams) (*PayPalOrder, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	if p == nil || p.Amount <= 0 {
		return nil, errors.New("PayPal 订单金额必须大于 0")
	}
	if p.Currency == "" || p.OrderNo == "" || p.ReturnURL == "" || p.CancelURL == "" {
		return nil, errors.New("PayPal 订单缺币种/平台单号/回跳地址")
	}
	payload := map[string]any{
		"intent": "CAPTURE",
		"purchase_units": []map[string]any{{
			"amount": map[string]any{
				"currency_code": strings.ToUpper(p.Currency),
				"value":         strconv.FormatFloat(p.Amount, 'f', 2, 64),
			},
			"custom_id":   p.OrderNo,
			"description": p.Description,
		}},
		"application_context": map[string]any{
			"brand_name":  "Xingjian Store",
			"user_action": "PAY_NOW",
			"return_url":  p.ReturnURL,
			"cancel_url":  p.CancelURL,
			"locale":      "en-US",
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL()+"/v2/checkout/orders", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	tok, err := c.accessToken(ctx)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	var out orderResponse
	if err := c.doJSON(ctx, req, &out); err != nil {
		return nil, err
	}
	if out.ID == "" {
		return nil, errors.New("PayPal 创建订单响应缺少 id")
	}
	// rel 优先 payer-action(新口径),回落 approve(旧口径)
	for i := range out.Links {
		l := out.Links[i]
		if l.Rel == "payer-action" || l.Rel == "approve" {
			return &PayPalOrder{ID: out.ID, ApproveURL: l.Href}, nil
		}
	}
	return nil, errors.New("PayPal 创建订单响应缺少审批跳转链接")
}

// CaptureResult 捕获结果(服务端确认扣款)。
type CaptureResult struct {
	OrderStatus   string // 订单状态(COMPLETED 等)
	CaptureID     string // 捕获交易 ID
	CaptureStatus string // COMPLETED=扣款成功;DECLINED/PENDING 等
	BuyerEmail    string // 买家邮箱
	BuyerName     string // 买家姓名(名+姓)
	CountryCode   string // 买家国家代码
}

// CaptureOrder 捕获已审批订单(POST /v2/checkout/orders/{id}/capture)。
// requestID 传平台订单号作 PayPal-Request-Id 幂等键(重复捕获返回同一结果)。
func (c *Client) CaptureOrder(ctx context.Context, orderID, requestID string) (*CaptureResult, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	if orderID == "" {
		return nil, errors.New("PayPal 订单 ID 不能为空")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL()+"/v2/checkout/orders/"+orderID+"/capture", nil)
	if err != nil {
		return nil, err
	}
	tok, err := c.accessToken(ctx)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	if requestID != "" {
		req.Header.Set("PayPal-Request-Id", requestID)
	}
	var out orderResponse
	if err := c.doJSON(ctx, req, &out); err != nil {
		return nil, err
	}
	res := &CaptureResult{OrderStatus: out.Status}
	if out.Payer.Name.GivenName != "" || out.Payer.Name.Surname != "" {
		res.BuyerName = strings.TrimSpace(out.Payer.Name.GivenName + " " + out.Payer.Name.Surname)
	}
	res.BuyerEmail = out.Payer.EmailAddress
	res.CountryCode = out.Payer.Address.CountryCode
	if len(out.PurchaseUnits) > 0 && len(out.PurchaseUnits[0].Payments.Captures) > 0 {
		cap := out.PurchaseUnits[0].Payments.Captures[0]
		res.CaptureID = cap.ID
		res.CaptureStatus = cap.Status
	}
	return res, nil
}
