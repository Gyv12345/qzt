// Package wxmp 封装微信服务号(公众号)服务端 API 调用。
//
// 微信内 H5 免登录(网页授权)流程:
//  1. 前端在微信浏览器内跳转授权页(构造 URL 见 BuildAuthorizeURL,scope=snsapi_base 静默授权)
//  2. 微信重定向回 redirect_uri?code=xxx&state=xxx
//  3. 后端用 code 调 Code2OpenID 换取 openid(无需用户确认)
//  4. 按 openid 匹配已绑定用户,签发 JWT(与账密登录同一令牌体系)
//
// 模板消息:SendTemplateMsg 用于通知推送(需已认证服务号)。
// access_token 有效期 7200s,用 Redis 缓存(key=wxmp:access_token,按 secret 隔离)。
// 凭证存 sys_oauth_config(provider=wechat_mp),Extra JSON 携带 template_id 等扩展字段。
package wxmp

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/pkg/xlogger"
)

const (
	apiBase        = "https://api.weixin.qq.com"
	accessTokenKey = "wxmp:access_token" // Redis 缓存 key 前缀
	accessTokenTTL = 7000 * time.Second  // 比官方 7200s 略短
	httpTimeout    = 10 * time.Second
)

// Config 服务号配置(从 sys_oauth_config provider=wechat_mp 读取)。
type Config struct {
	AppID       string
	Secret      string
	RedirectURI string // OAuth 回调地址(指向移动端 SPA 页面)
	TemplateID  string // 通知模板 ID(存于 Extra JSON,可为空=通知渠道关闭)
}

// Client 服务号 API 客户端。
type Client struct {
	cfg Config
	hc  *http.Client
}

// NewClient 创建服务号客户端。
func NewClient(cfg Config) *Client {
	return &Client{cfg: cfg, hc: &http.Client{Timeout: httpTimeout}}
}

// IsConfigured 检查是否已配置服务号参数(appid 和 secret 非空)。
func (c *Client) IsConfigured() bool {
	return c.cfg.AppID != "" && c.cfg.Secret != ""
}

// RedirectURI 返回配置的 OAuth 回调地址(移动端 SPA 页面)。
func (c *Client) RedirectURI() string { return c.cfg.RedirectURI }

// NotifyEnabled 模板消息渠道是否可用(配置完整且有模板 ID)。
func (c *Client) NotifyEnabled() bool {
	return c.IsConfigured() && c.cfg.TemplateID != ""
}

// tokenCacheKey 按 secret 派生缓存 key(同一实例多套凭证时隔离)。
func (c *Client) tokenCacheKey() string {
	if c.cfg.Secret == "" {
		return accessTokenKey
	}
	sum := sha1.Sum([]byte(c.cfg.Secret))
	return accessTokenKey + ":" + hex.EncodeToString(sum[:8])
}

// BuildAuthorizeURL 构造微信网页授权 URL(scope=snsapi_base 静默授权,仅取 openid)。
func (c *Client) BuildAuthorizeURL(state, redirectURI string) string {
	return fmt.Sprintf("https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=snsapi_base&state=%s#wechat_redirect",
		url.QueryEscape(c.cfg.AppID),
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)
}

// ── access_token ──

type tokenResponse struct {
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// GetAccessToken 获取 access_token(优先读 Redis 缓存)。
func (c *Client) GetAccessToken(ctx context.Context) (string, error) {
	store := cache.GetStore()
	if store != nil {
		if token, err := store.Get(c.tokenCacheKey()); err == nil && token != "" {
			return token, nil
		}
	}

	u := fmt.Sprintf("%s/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
		apiBase, url.QueryEscape(c.cfg.AppID), url.QueryEscape(c.cfg.Secret))

	var resp tokenResponse
	if err := c.httpGetJSON(ctx, u, &resp); err != nil {
		return "", fmt.Errorf("获取服务号 access_token 失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", fmt.Errorf("服务号返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}

	if store != nil {
		if err := store.Set(c.tokenCacheKey(), resp.AccessToken, accessTokenTTL); err != nil {
			xlogger.ErrorfCtx(ctx, "缓存服务号 access_token 失败(不影响本次调用): %v", err)
		}
	}
	return resp.AccessToken, nil
}

// ── OAuth code → openid ──

// oauthTokenResponse 网页授权 code 换取 openid 的响应。
// 注意:这里的 access_token 是用户级 OAuth token(一次性),与 cgi-bin 的全局 access_token 无关。
type oauthTokenResponse struct {
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	OpenID      string `json:"openid"`
}

// Code2OpenID 用网页授权 code 换取用户 openid(snsapi_base 静默授权足够)。
func (c *Client) Code2OpenID(ctx context.Context, code string) (string, error) {
	u := fmt.Sprintf("%s/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code",
		apiBase, url.QueryEscape(c.cfg.AppID), url.QueryEscape(c.cfg.Secret), url.QueryEscape(code))

	var resp oauthTokenResponse
	if err := c.httpGetJSON(ctx, u, &resp); err != nil {
		return "", fmt.Errorf("微信授权失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", fmt.Errorf("微信授权失败: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	if resp.OpenID == "" {
		return "", errors.New("微信授权失败: 未返回 openid")
	}
	return resp.OpenID, nil
}

// ── 模板消息 ──

type templateValue struct {
	Value string `json:"value"`
	Color string `json:"color,omitempty"`
}

type templateMessageRequest struct {
	ToUser     string                   `json:"touser"`
	TemplateID string                   `json:"template_id"`
	URL        string                   `json:"url,omitempty"`
	Data       map[string]templateValue `json:"data"`
}

type templateMessageResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	MsgID   int64  `json:"msgid"`
}

// SendTemplateMsg 发送模板消息(通知推送用)。
// title=标题(first), content=内容(keyword1), 时间取当前(keyword2), 点击跳转 url 可为空。
func (c *Client) SendTemplateMsg(ctx context.Context, openid, title, content, jumpURL string) error {
	if !c.NotifyEnabled() {
		return errors.New("服务号模板消息未配置")
	}
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return err
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	reqBody := templateMessageRequest{
		ToUser:     openid,
		TemplateID: c.cfg.TemplateID,
		URL:        jumpURL,
		Data: map[string]templateValue{
			"first":    {Value: title, Color: "#1677FF"},
			"keyword1": {Value: content},
			"keyword2": {Value: now},
			"remark":   {Value: "点击查看详情"},
		},
	}

	u := apiBase + "/cgi-bin/message/template/send?access_token=" + url.QueryEscape(token)
	var resp templateMessageResponse
	if err := c.httpPostJSON(ctx, u, reqBody, &resp); err != nil {
		return fmt.Errorf("服务号模板消息发送失败: %w", err)
	}
	if resp.ErrCode != 0 {
		// 43004=用户未关注服务号;40037=模板 ID 无效
		return fmt.Errorf("服务号返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	return nil
}

// ── 内部 HTTP 工具 ──

func (c *Client) httpGetJSON(ctx context.Context, url string, target any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}
	return json.Unmarshal(body, target)
}

func (c *Client) httpPostJSON(ctx context.Context, url string, body any, target any) error {
	jsonBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}
	return json.Unmarshal(respBody, target)
}
