// Package douyin 抖音开放平台客户端（GEO 信源产线的视频直发端）。
//
// 能力：OAuth 授权（authorize → code 换 token → refresh）、用户信息、
// 视频上传 + 发布（video/upload → video/create）。
//
// 前置：需在 developer.open-douyin.com 创建自研应用、申请「视频发布」能力
// （video.create 等 scope，审核制），审核通过并把 client_key/secret 配入
// sys_oauth_config(provider=douyin) 后本客户端才可用。
//
// token 不在本包管理——geo service 负责按账号落库（geo_platform_account），
// 过期前用 refresh_token 刷新；本客户端保持无状态。
package douyin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// defaultOpenBase 抖音开放平台域名（授权与 OpenAPI 同域）。
const defaultOpenBase = "https://open.douyin.com"

// httpTimeout 单次调用超时（视频上传较大，放宽）。
const httpTimeout = 120 * time.Second

// Scope 视频直发所需权限（应用能力审核通过后才有实际效力）。
const Scope = "video.create,video.data"

// Config 应用配置（从 sys_oauth_config provider=douyin 读取：
// app_id=client_key、app_secret=client_secret、redirect_uri=授权回调）。
type Config struct {
	ClientKey    string
	ClientSecret string
	RedirectURI  string
}

// Client 抖音开放平台客户端（无状态；base 域名为字段便于测试桩替换）。
type Client struct {
	cfg       Config
	oauthBase string
	apiBase   string
	hc        *http.Client
}

// NewClient 构建客户端。
func NewClient(cfg Config) *Client {
	return &Client{cfg: cfg, oauthBase: defaultOpenBase, apiBase: defaultOpenBase, hc: &http.Client{Timeout: httpTimeout}}
}

// IsConfigured 应用参数是否完整。
func (c *Client) IsConfigured() bool {
	return c.cfg.ClientKey != "" && c.cfg.ClientSecret != ""
}

// ── OAuth ──

// Token 授权令牌（换新/刷新共用）。
type Token struct {
	AccessToken      string
	OpenID           string
	ExpiresIn        int // 秒
	RefreshToken     string
	RefreshExpiresIn int
	Scope            string
}

// AuthorizeURL 构造网页授权地址（运营在浏览器打开 → 抖音扫码授权 →
// 回调 redirect_uri?code=xxx&state=xxx → 用 code 调 ExchangeToken）。
func (c *Client) AuthorizeURL(state string) string {
	q := url.Values{}
	q.Set("client_key", c.cfg.ClientKey)
	q.Set("response_type", "code")
	q.Set("scope", Scope)
	q.Set("redirect_uri", c.cfg.RedirectURI)
	q.Set("state", state)
	return c.oauthBase + "/platform/oauth/connect/?" + q.Encode()
}

// ExchangeToken 用授权 code 换取令牌。
func (c *Client) ExchangeToken(ctx context.Context, code string) (*Token, error) {
	return c.tokenRequest(ctx, "/oauth/access_token/", url.Values{
		"client_key":    {c.cfg.ClientKey},
		"client_secret": {c.cfg.ClientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
	})
}

// RefreshAccessToken 用 refresh_token 续期。
func (c *Client) RefreshAccessToken(ctx context.Context, refreshToken string) (*Token, error) {
	return c.tokenRequest(ctx, "/oauth/refresh_token/", url.Values{
		"client_key":    {c.cfg.ClientKey},
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
	})
}

// Userinfo 拉取授权用户昵称/头像（绑定展示用）。
func (c *Client) Userinfo(ctx context.Context, accessToken, openID string) (nickname, avatar string, err error) {
	q := url.Values{}
	q.Set("access_token", accessToken)
	q.Set("open_id", openID)
	var resp struct {
		Data struct {
			Nickname string `json:"nickname"`
			Avatar   string `json:"avatar"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := c.doJSON(ctx, http.MethodGet, c.oauthBase+"/oauth/userinfo/?"+q.Encode(), nil, &resp); err != nil {
		return "", "", fmt.Errorf("获取抖音用户信息失败: %w", err)
	}
	return resp.Data.Nickname, resp.Data.Avatar, nil
}

func (c *Client) tokenRequest(ctx context.Context, path string, form url.Values) (*Token, error) {
	var resp struct {
		Data struct {
			AccessToken      string   `json:"access_token"`
			OpenID           string   `json:"open_id"`
			ExpiresIn        int      `json:"expires_in"`
			RefreshToken     string   `json:"refresh_token"`
			RefreshExpiresIn int      `json:"refresh_expires_in"`
			Scope            []string `json:"scope"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := c.doJSON(ctx, http.MethodPost, c.oauthBase+path+"?"+form.Encode(), nil, &resp); err != nil {
		return nil, fmt.Errorf("换取抖音令牌失败: %w", err)
	}
	if resp.Data.AccessToken == "" {
		return nil, fmt.Errorf("换取抖音令牌失败: %s", resp.Message)
	}
	return &Token{
		AccessToken:      resp.Data.AccessToken,
		OpenID:           resp.Data.OpenID,
		ExpiresIn:        resp.Data.ExpiresIn,
		RefreshToken:     resp.Data.RefreshToken,
		RefreshExpiresIn: resp.Data.RefreshExpiresIn,
		Scope:            strings.Join(resp.Data.Scope, ","),
	}, nil
}

// ── 视频直发 ──

// UploadVideo 上传视频文件，返回 upload_id（创建视频用）。
// 简化版走一次性整包上传（抖音对 ≤64MB 视频支持整包；分片接口后续按需补）。
func (c *Client) UploadVideo(ctx context.Context, accessToken, openID, filename string, video []byte) (uploadID string, err error) {
	q := url.Values{}
	q.Set("access_token", accessToken)
	q.Set("open_id", openID)

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("video", filename)
	if err != nil {
		return "", err
	}
	if _, err := fw.Write(video); err != nil {
		return "", err
	}
	if err := w.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase+"/video/upload/?"+q.Encode(), &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	respHTTP, err := c.hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("上传抖音视频失败: %w", err)
	}
	defer respHTTP.Body.Close()
	body, err := io.ReadAll(io.LimitReader(respHTTP.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if respHTTP.StatusCode != http.StatusOK {
		return "", fmt.Errorf("上传抖音视频失败: HTTP %d: %s", respHTTP.StatusCode, truncate(body))
	}
	var resp struct {
		Data struct {
			Video struct {
				UploadID string `json:"upload_id"`
			} `json:"video"`
			ErrorCode int    `json:"error_code"`
			Desc      string `json:"description"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("解析抖音上传响应失败: %w", err)
	}
	if resp.Data.ErrorCode != 0 || resp.Data.Video.UploadID == "" {
		return "", fmt.Errorf("上传抖音视频失败: code=%d %s %s", resp.Data.ErrorCode, resp.Data.Desc, resp.Message)
	}
	return resp.Data.Video.UploadID, nil
}

// CreateVideo 用已上传的视频创建抖音内容（发布），返回 item_id。
// text 为视频文案（可带话题，如「#开源 #CRM」）。
func (c *Client) CreateVideo(ctx context.Context, accessToken, openID, uploadID, text string) (itemID string, err error) {
	q := url.Values{}
	q.Set("access_token", accessToken)
	q.Set("open_id", openID)
	body := map[string]string{"upload_id": uploadID, "text": text}
	var resp struct {
		Data struct {
			ItemID    string `json:"item_id"`
			ErrorCode int    `json:"error_code"`
			Desc      string `json:"description"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := c.doJSON(ctx, http.MethodPost, c.apiBase+"/video/create/?"+q.Encode(), body, &resp); err != nil {
		return "", fmt.Errorf("发布抖音视频失败: %w", err)
	}
	if resp.Data.ErrorCode != 0 || resp.Data.ItemID == "" {
		return "", fmt.Errorf("发布抖音视频失败: code=%d %s %s", resp.Data.ErrorCode, resp.Data.Desc, resp.Message)
	}
	return resp.Data.ItemID, nil
}

// ── 内部工具 ──

func (c *Client) doJSON(ctx context.Context, method, fullURL string, body any, target any) error {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, fullURL, reader)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return errors.New("HTTP " + resp.Status + ": " + truncate(b))
	}
	return json.Unmarshal(b, target)
}

func truncate(b []byte) string {
	s := string(b)
	if len(s) > 300 {
		return s[:300]
	}
	return s
}
