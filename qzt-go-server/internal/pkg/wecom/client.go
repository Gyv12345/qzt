// Package wecom 封装企业微信服务端 API 调用。
//
// 扫码登录(OAuth2 网页授权)流程:
//  1. 前端跳转到企业微信授权页(构造 URL 见 BuildAuthorizeURL)
//  2. 用户扫码确认后,企业微信回调 redirect_uri?code=xxx
//  3. 后端用 code 调 GetUserIDByCode 换取企业微信 userid
//  4. 按 userid 匹配/创建本地用户,签发 JWT
//
// access_token 有效期 7200s,用 Redis 缓存(key=wecom:access_token)避免频繁调用。
// corp_id/secret/agent_id 从 sys_config 表读取(setting.Get),管理员后台可热改。
package wecom

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
	apiBase        = "https://qyapi.weixin.qq.com/cgi-bin"
	accessTokenKey = "wecom:access_token" // Redis 缓存 key
	accessTokenTTL = 7000 * time.Second   // 比官方 7200s 略短
	httpTimeout    = 10 * time.Second
)

// Config 企业微信配置(从 sys_config 读取)。
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

// tokenCacheKey 按 secret 派生 access_token 缓存 key。
// 企微不同数据域(通讯录/打卡/审批)用各自独立 Secret,access_token 必须按 secret 隔离缓存,
// 否则打卡 Secret 换来的 token 会被通讯录 Secret 的 token 覆盖。
// 空 secret 兜底用默认 key(等价旧行为,向后兼容)。
func (c *Client) tokenCacheKey() string {
	if c.cfg.Secret == "" {
		return accessTokenKey
	}
	sum := sha1.Sum([]byte(c.cfg.Secret))
	return accessTokenKey + ":" + hex.EncodeToString(sum[:8])
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

// gettoken 响应。
type tokenResponse struct {
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// GetAccessToken 获取 access_token(优先读 Redis 缓存,不存在则调企业微信 API)。
func (c *Client) GetAccessToken(ctx context.Context) (string, error) {
	// 1. 读缓存
	store := cache.GetStore()
	if store != nil {
		if token, err := store.Get(c.tokenCacheKey()); err == nil && token != "" {
			return token, nil
		}
	}

	// 2. 调 API 获取
	u := fmt.Sprintf("%s/gettoken?corpid=%s&corpsecret=%s",
		apiBase, url.QueryEscape(c.cfg.CorpID), url.QueryEscape(c.cfg.Secret))

	var resp tokenResponse
	if err := c.httpGetJSON(ctx, u, &resp); err != nil {
		return "", fmt.Errorf("获取企业微信 access_token 失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", fmt.Errorf("企业微信返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}

	// 3. 写缓存
	if store != nil {
		if err := store.Set(c.tokenCacheKey(), resp.AccessToken, accessTokenTTL); err != nil {
			xlogger.ErrorfCtx(ctx, "缓存企业微信 access_token 失败(不影响本次调用): %v", err)
		}
	}
	return resp.AccessToken, nil
}

// RefreshAccessToken 强制刷新 access_token(配置变更后调用)。
func (c *Client) RefreshAccessToken(ctx context.Context) (string, error) {
	store := cache.GetStore()
	if store != nil {
		_ = store.Set(c.tokenCacheKey(), "", 1*time.Second) // 立即过期
	}
	return c.GetAccessToken(ctx)
}

// ── OAuth code → userid ──

// getuserinfo 响应(网页授权获取访问用户身份)。
type userInfoResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	UserID  string `json:"userid"` // 企业成员的 userid
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

// ── 读取成员(可选,获取姓名/头像) ──

// user/get 响应(读取成员详情)。
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

// GetMember 获取成员姓名/头像(可选,用于自动创建用户时填充昵称)。
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

// ── 应用消息推送 ──

// sendMessageRequest 企业微信消息发送请求体。
type sendMessageRequest struct {
	ToUser  string          `json:"touser"`
	MsgType string          `json:"msgtype"`
	AgentID string          `json:"agentid"`
	Text    *msgText        `json:"text,omitempty"`
	Markdown *msgMarkdown   `json:"markdown,omitempty"`
}

type msgText struct {
	Content string `json:"content"`
}

type msgMarkdown struct {
	Content string `json:"content"`
}

// sendMessageResponse 企业微信消息发送响应。
type sendMessageResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	MsgID   string `json:"msgid"`
}

// SendMessage 发送应用消息到企业微信用户。
// msgType: "text" 或 "markdown"
func (c *Client) SendMessage(ctx context.Context, toUser, msgType, content string) error {
	if !c.IsConfigured() {
		return nil // 未配置企业微信,静默跳过
	}

	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("获取 access_token 失败: %w", err)
	}

	u := fmt.Sprintf("%s/message/send?access_token=%s", apiBase, url.QueryEscape(token))

	reqBody := sendMessageRequest{
		ToUser:  toUser,
		MsgType: msgType,
		AgentID: c.cfg.AgentID,
	}
	switch msgType {
	case "markdown":
		reqBody.Markdown = &msgMarkdown{Content: content}
	default:
		reqBody.MsgType = "text"
		reqBody.Text = &msgText{Content: content}
	}

	var resp sendMessageResponse
	if err := c.httpPostJSON(ctx, u, reqBody, &resp); err != nil {
		return fmt.Errorf("企业微信发送消息失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return fmt.Errorf("企业微信返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	return nil
}

// ── 内部 HTTP 工具 ──

// httpGetJSON 发 GET 请求并解析 JSON。
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

// httpPostJSON 发 POST 请求(JSON body)并解析 JSON 响应。
func (c *Client) httpPostJSON(ctx context.Context, url string, body interface{}, target interface{}) error {
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

// ── 打卡数据(checkin/getcheckindata) ──
// 注意:本接口必须用「打卡应用 Secret」换来的 access_token,故调用方需用 checkin_secret
// 构造 Client 实例(NewClient(Config{Secret: checkin_secret})),不能复用通讯录/自建应用的 Client。

// checkinDataRequest 企微打卡数据请求体。
type checkinDataRequest struct {
	OpenCheckinDataType int      `json:"opencheckindatatype"` // 1:上下班 2:外出 3:全部
	StartTime           int64    `json:"starttime"`           // 秒级时间戳
	EndTime             int64    `json:"endtime"`
	UserIDList          []string `json:"useridlist"`          // 企微 userid 列表,≤100
}

// CheckinRecord 企微打卡记录(字段按企微文档裁剪)。
type CheckinRecord struct {
	UserID         string   `json:"userid"`
	GroupName      string   `json:"groupname"`
	CheckinType    string   `json:"checkin_type"`   // 上班打卡/下班打卡
	ExceptionType  string   `json:"exception_type"`
	CheckinTime    int64    `json:"checkin_time"`   // 秒级时间戳
	LocationTitle  string   `json:"location_title"`
	SchCheckinTime int64    `json:"sch_checkin_time"`
	LocationDetail string   `json:"location_detail"`
	MediaIDs       []string `json:"mediaids,omitempty"`
}

type checkinDataResponse struct {
	ErrCode int             `json:"errcode"`
	ErrMsg  string          `json:"errmsg"`
	Data    []CheckinRecord `json:"checkindata"`
}

// GetCheckinData 拉取企微打卡记录。
// dataType:1=上下班 2=外出 3=全部;start/end 为秒级时间戳;userIDs≤100。
func (c *Client) GetCheckinData(ctx context.Context, dataType int, start, end int64, userIDs []string) ([]CheckinRecord, error) {
	if !c.IsConfigured() {
		return nil, errors.New("企业微信打卡未配置(checkin_secret 缺失)")
	}
	if len(userIDs) == 0 {
		return nil, nil
	}
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取 access_token 失败: %w", err)
	}
	u := fmt.Sprintf("%s/checkin/getcheckindata?access_token=%s", apiBase, url.QueryEscape(token))
	reqBody := checkinDataRequest{
		OpenCheckinDataType: dataType,
		StartTime:           start,
		EndTime:             end,
		UserIDList:          userIDs,
	}
	var resp checkinDataResponse
	if err := c.httpPostJSON(ctx, u, reqBody, &resp); err != nil {
		return nil, fmt.Errorf("拉取企业微信打卡数据失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return nil, fmt.Errorf("企业微信返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	return resp.Data, nil
}
