// Package oceanengine 封装巨量引擎开放平台(Marketing API)调用。
//
// 飞鱼线索自动入库链路:
//  1. 客户在巨量引擎商业开放平台自建「自用型」应用,申请飞鱼线索接口权限
//  2. 管理后台填 app_id/app_secret → BuildAuthorizeURL 生成授权链接 → 广告主扫码授权
//  3. 巨量回调带 auth_code → GetTokenByAuthCode 换 access/refresh token + 广告主列表
//  4. 定时任务用 access_token 调 ListLeads 增量拉取线索;token 过期用 RefreshToken 续期
//
// access_token 有效期约 24h、refresh_token 约 30d,均存 DB(marketing_account 表),
// 无需 Redis 缓存。
package oceanengine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	defaultAPIBase = "https://ad.oceanengine.com/open_api"
	authorizePage  = "https://open.oceanengine.com/audit/oauth.html"
	httpTimeout    = 10 * time.Second

	// TimeLayout 巨量接口的时间参数/响应字段格式。
	TimeLayout = "2006-01-02 15:04:05"
)

// 接口路径。官方文档站需登录才能看到正文,以下路径以官方 Go SDK
// (github.com/oceanengine/ad_open_sdk_go)为准核实;若有变动只改这里。
const (
	pathAccessToken   = "/oauth2/access_token/"   // 获取/刷新 token(grant_type 区分)
	pathAdvertiserGet = "/oauth2/advertiser/get/" // 获取已授权广告主账户
	pathClueLeadGet   = "/2/tools/clue_info/get/" // 飞鱼线索列表
)

// Config 巨量引擎开放平台应用配置(每客户一条,存 marketing_account 表)。
type Config struct {
	AppID     string
	AppSecret string
}

// Client 巨量引擎 API 客户端。
type Client struct {
	cfg     Config
	hc      *http.Client
	apiBase string // 可覆盖,测试用
}

// NewClient 创建客户端(使用官方 API 地址)。
func NewClient(cfg Config) *Client {
	return NewClientWithBaseURL(cfg, defaultAPIBase)
}

// NewClientWithBaseURL 创建客户端并指定 API 地址(仅测试用)。
func NewClientWithBaseURL(cfg Config, apiBase string) *Client {
	return &Client{
		cfg:     cfg,
		hc:      &http.Client{Timeout: httpTimeout},
		apiBase: apiBase,
	}
}

// BuildAuthorizeURL 构造巨量引擎 OAuth 授权链接。
// state 用于防 CSRF 并关联本地账号,由调用方生成(建议存 Redis 限时效)。
// scope 不传,授权页默认申请该应用已开通的全部接口权限。
func (c *Client) BuildAuthorizeURL(redirectURI, state string) string {
	return fmt.Sprintf("%s?app_id=%s&redirect_uri=%s&state=%s",
		authorizePage,
		url.QueryEscape(c.cfg.AppID),
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)
}

// ── 通用响应信封 ──

// apiResponse 巨量统一响应信封,code=0 为成功。
type apiResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

// check 校验信封,非 0 返回带 message 的错误。
func (r *apiResponse) check(apiName string) error {
	if r.Code != 0 {
		return fmt.Errorf("巨量引擎 %s 返回错误: code=%d message=%s", apiName, r.Code, r.Message)
	}
	return nil
}

// ── OAuth token ──

// TokenBundle token 换取/刷新结果。
type TokenBundle struct {
	AccessToken      string
	RefreshToken     string
	ExpiresIn        int      // access_token 剩余秒数
	RefreshExpiresIn int      // refresh_token 剩余秒数
	AdvertiserIDs    []string // 授权返回的广告主 ID(可能为空,用 GetAdvertisers 兜底)
}

// tokenResponse oauth2/access_token 的 data 部分。
type tokenResponse struct {
	AccessToken      string  `json:"access_token"`
	RefreshToken     string  `json:"refresh_token"`
	ExpiresIn        int     `json:"expires_in"`
	RefreshExpiresIn int     `json:"refresh_token_expires_in"`
	AdvertiserIDs    []int64 `json:"advertiser_ids"`
	AdvertiserID     int64   `json:"advertiser_id"`
}

// GetTokenByAuthCode 用回调的 auth_code 换取 access/refresh token。
func (c *Client) GetTokenByAuthCode(ctx context.Context, authCode string) (*TokenBundle, error) {
	return c.exchangeToken(ctx, map[string]string{
		"app_id":     c.cfg.AppID,
		"secret":     c.cfg.AppSecret,
		"grant_type": "authorization_code",
		"auth_code":  authCode,
	})
}

// RefreshToken 用 refresh_token 换新 access/refresh token(旧 refresh 同时作废)。
func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*TokenBundle, error) {
	return c.exchangeToken(ctx, map[string]string{
		"app_id":        c.cfg.AppID,
		"secret":        c.cfg.AppSecret,
		"grant_type":    "refresh_token",
		"refresh_token": refreshToken,
	})
}

// exchangeToken 调 oauth2/access_token(grant_type 区分换取/刷新)。
func (c *Client) exchangeToken(ctx context.Context, body map[string]string) (*TokenBundle, error) {
	var env apiResponse
	if err := c.httpPostJSON(ctx, c.apiBase+pathAccessToken, body, &env); err != nil {
		return nil, err
	}
	if err := env.check("获取token"); err != nil {
		return nil, err
	}
	var data tokenResponse
	if err := json.Unmarshal(env.Data, &data); err != nil {
		return nil, fmt.Errorf("解析 token 响应失败: %w", err)
	}
	if data.AccessToken == "" {
		return nil, fmt.Errorf("巨量引擎未返回 access_token")
	}
	ids := data.AdvertiserIDs
	if len(ids) == 0 && data.AdvertiserID != 0 {
		ids = []int64{data.AdvertiserID}
	}
	strIDs := make([]string, 0, len(ids))
	for _, id := range ids {
		strIDs = append(strIDs, strconv.FormatInt(id, 10))
	}
	return &TokenBundle{
		AccessToken:      data.AccessToken,
		RefreshToken:     data.RefreshToken,
		ExpiresIn:        data.ExpiresIn,
		RefreshExpiresIn: data.RefreshExpiresIn,
		AdvertiserIDs:    strIDs,
	}, nil
}

// ── 已授权广告主 ──

// advertiserGetResponse oauth2/advertiser/get 的 data 部分。
type advertiserGetResponse struct {
	List []int64 `json:"list"`
}

// GetAdvertisers 查询该 access_token 已授权的全部广告主 ID。
func (c *Client) GetAdvertisers(ctx context.Context, accessToken string) ([]string, error) {
	u := fmt.Sprintf("%s%s?access_token=%s&app_id=%s&secret=%s",
		c.apiBase, pathAdvertiserGet,
		url.QueryEscape(accessToken),
		url.QueryEscape(c.cfg.AppID),
		url.QueryEscape(c.cfg.AppSecret),
	)
	var env apiResponse
	if err := c.httpGetJSON(ctx, u, &env); err != nil {
		return nil, err
	}
	if err := env.check("获取已授权账户"); err != nil {
		return nil, err
	}
	var data advertiserGetResponse
	if err := json.Unmarshal(env.Data, &data); err != nil {
		return nil, fmt.Errorf("解析已授权账户响应失败: %w", err)
	}
	ids := make([]string, 0, len(data.List))
	for _, id := range data.List {
		ids = append(ids, strconv.FormatInt(id, 10))
	}
	return ids, nil
}

// ── 飞鱼线索 ──

// ExternalLead 拉取到的外部线索(字段按飞鱼线索文档裁剪,Raw 保留原始报文防字段漂移)。
type ExternalLead struct {
	ExternalID   string          // clue_id
	Name         string          // clue_name
	Phone        string          // clue_phone
	Email        string          // clue_email
	Company      string          // company
	CampaignName string          // campaign_name 广告计划
	AdName       string          // ad_name 广告
	CreateTime   time.Time       // 留资时间
	Raw          json.RawMessage // 原始线索报文
}

// clueLeadResponse 飞鱼线索 data 部分。
type clueLeadResponse struct {
	Page        int               `json:"page"`
	PageSize    int               `json:"page_size"`
	TotalNumber int               `json:"total_number"`
	List        []json.RawMessage `json:"list"`
}

// clueLeadItem 单条线索(字段名以飞鱼线索文档为准,未知的忽略)。
type clueLeadItem struct {
	ClueID       int64  `json:"clue_id"`
	ClueName     string `json:"clue_name"`
	CluePhone    string `json:"clue_phone"`
	ClueEmail    string `json:"clue_email"`
	Company      string `json:"company"`
	CampaignName string `json:"campaign_name"`
	AdName       string `json:"ad_name"`
	CreateTime   string `json:"create_time"`
}

// ListLeads 拉取飞鱼线索列表(时间窗内分页)。
// start/end 为本地时间,按 TimeLayout 格式化后传给接口;返回线索与总条数。
func (c *Client) ListLeads(ctx context.Context, accessToken, advertiserID string, start, end time.Time, page, pageSize int) ([]ExternalLead, int, error) {
	v := url.Values{}
	v.Set("access_token", accessToken)
	v.Set("advertiser_id", advertiserID)
	v.Set("start_time", start.Format(TimeLayout))
	v.Set("end_time", end.Format(TimeLayout))
	v.Set("page", strconv.Itoa(page))
	v.Set("page_size", strconv.Itoa(pageSize))
	u := c.apiBase + pathClueLeadGet + "?" + v.Encode()

	var env apiResponse
	if err := c.httpGetJSON(ctx, u, &env); err != nil {
		return nil, 0, err
	}
	if err := env.check("获取线索列表"); err != nil {
		return nil, 0, err
	}
	var data clueLeadResponse
	if err := json.Unmarshal(env.Data, &data); err != nil {
		return nil, 0, fmt.Errorf("解析线索列表响应失败: %w", err)
	}

	leads := make([]ExternalLead, 0, len(data.List))
	for _, raw := range data.List {
		var item clueLeadItem
		if err := json.Unmarshal(raw, &item); err != nil {
			return nil, 0, fmt.Errorf("解析单条线索失败: %w", err)
		}
		leads = append(leads, ExternalLead{
			ExternalID:   strconv.FormatInt(item.ClueID, 10),
			Name:         item.ClueName,
			Phone:        item.CluePhone,
			Email:        item.ClueEmail,
			Company:      item.Company,
			CampaignName: item.CampaignName,
			AdName:       item.AdName,
			CreateTime:   parseClueTime(item.CreateTime),
			Raw:          raw,
		})
	}
	return leads, data.TotalNumber, nil
}

// parseClueTime 解析留资时间(失败返回零值,不阻断)。
func parseClueTime(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	if t, err := time.ParseInLocation(TimeLayout, s, time.Local); err == nil {
		return t
	}
	return time.Time{}
}

// ── 内部 HTTP 工具 ──

// httpGetJSON 发 GET 请求并解析 JSON。
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

// httpPostJSON 发 POST 请求(JSON body)并解析 JSON 响应。
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
