// Package wecom 封装企业微信服务端 API 调用。
//
// 扫码登录(OAuth2 网页授权)流程:
//  1. 前端跳转到企业微信授权页(构造 URL 见 BuildAuthorizeURL)
//  2. 用户扫码确认后,企业微信回调 redirect_uri?code=xxx
//  3. 后端用 code 调 GetUserIDByCode 换取企业微信 userid
//  4. 按 userid 匹配/创建本地用户,签发 JWT
//
// access_token 有效期 7200s,用 Redis 缓存(key=wecom:access_token)避免频繁调用。
// corp_id/secret/agent_id 从 sys_oauth_config 表读取,管理员后台可热改。
package wecom

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/pkg/xlogger"
)

const (
	apiBase        = "https://qyapi.weixin.qq.com/cgi-bin"
	accessTokenKey = "wecom:access_token" // Redis 缓存 key
	accessTokenTTL = 7000 * time.Second   // 比官方 7200s 略短
	httpTimeout    = 10 * time.Second
)

// Config 企业微信配置(从 sys_oauth_config 读取)。
type Config struct {
	CorpID      string
	AgentID     string
	Secret      string
	RedirectURI string // OAuth 回调地址
}

// Client 企业微信 API 客户端。
type Client struct {
	cfg Config
	hc  *http.Client
}

// NewClient 创建企业微信客户端。
func NewClient(cfg Config) *Client {
	return &Client{
		cfg: cfg,
		hc:  &http.Client{Timeout: httpTimeout},
	}
}

// IsConfigured 检查是否已配置企业微信参数(corp_id 和 secret 非空)。
func (c *Client) IsConfigured() bool {
	return c.cfg.CorpID != "" && c.cfg.Secret != ""
}

// BuildAuthorizeURL 构造企业微信 OAuth2 网页授权 URL(前端跳转到此 URL 显示扫码页)。
// state 用于防 CSRF,由调用方生成。
func (c *Client) BuildAuthorizeURL(state string) string {
	return fmt.Sprintf("https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=snsapi_base&state=%s#wechat_redirect",
		url.QueryEscape(c.cfg.CorpID),
		url.QueryEscape(c.cfg.RedirectURI),
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

// GetAccessToken 获取 access_token(优先读 Redis 缓存,不存在则调企业微信 API)。
func (c *Client) GetAccessToken(ctx context.Context) (string, error) {
	store := cache.GetStore()
	if store != nil {
		if token, err := store.Get(accessTokenKey); err == nil && token != "" {
			return token, nil
		}
	}

	u := fmt.Sprintf("%s/gettoken?corpid=%s&corpsecret=%s",
		apiBase, url.QueryEscape(c.cfg.CorpID), url.QueryEscape(c.cfg.Secret))

	var resp tokenResponse
	if err := c.httpGetJSON(ctx, u, &resp); err != nil {
		return "", fmt.Errorf("获取企业微信 access_token 失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", fmt.Errorf("企业微信返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}

	if store != nil {
		if err := store.Set(accessTokenKey, resp.AccessToken, accessTokenTTL); err != nil {
			xlogger.ErrorfCtx(ctx, "缓存企业微信 access_token 失败(不影响本次调用): %v", err)
		}
	}
	return resp.AccessToken, nil
}

// ── OAuth code → userid ──

type userInfoResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	UserID  string `json:"userid"`
}

// GetUserIDByCode 用 OAuth code 换取企业微信 userid。
func (c *Client) GetUserIDByCode(ctx context.Context, code string) (string, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return "", err
	}
	u := fmt.Sprintf("%s/auth/getuserinfo?access_token=%s&code=%s",
		apiBase, url.QueryEscape(token), url.QueryEscape(code))

	var resp userInfoResponse
	if err := c.httpGetJSON(ctx, u, &resp); err != nil {
		return "", fmt.Errorf("企业微信换取 userid 失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", fmt.Errorf("企业微信返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	if resp.UserID == "" {
		return "", fmt.Errorf("该用户不是企业成员(非企业微信用户或未授权)")
	}
	return resp.UserID, nil
}

// ── 读取成员(获取姓名/头像) ──

type memberDetailResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	Name    string `json:"name"`
	Avatar  string `json:"avatar"`
}

// MemberInfo 成员简要信息。
type MemberInfo struct {
	Name   string
	Avatar string
}

// GetMember 获取成员姓名/头像(自动创建用户时填充昵称)。
func (c *Client) GetMember(ctx context.Context, userID string) (*MemberInfo, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	u := fmt.Sprintf("%s/user/get?access_token=%s&userid=%s",
		apiBase, url.QueryEscape(token), url.QueryEscape(userID))

	var resp memberDetailResponse
	if err := c.httpGetJSON(ctx, u, &resp); err != nil {
		return nil, err
	}
	if resp.ErrCode != 0 {
		return nil, fmt.Errorf("企业微信返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	return &MemberInfo{Name: resp.Name, Avatar: resp.Avatar}, nil
}

// ── 内部 HTTP 工具 ──

func (c *Client) httpGetJSON(ctx context.Context, url string, target interface{}) error {
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
