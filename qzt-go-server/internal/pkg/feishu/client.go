// Package feishu 封装飞书(Feishu/Lark)服务端 API 调用(P32 通讯录同步/扫码登录/消息推送)。
//
// tenant_access_token:POST /auth/v3/tenant_access_token/internal,包内缓存到期重取。
// 通讯录:contact/v3/departments/find_by_parent 从根(parent_department_id=0)迭代、
//
//	contact/v3/users/find_by_department 按部门拉人(user_id_type=open_id)。
//
// 消息推送:im/v1/messages?receive_id_type=open_id(文本)。
// 扫码登录:authen/v1/authorize 网页授权(出码)→ authen/v1/oidc/access_token 换
//
//	user_access_token → authen/v1/user_info 读 open_id/name。
//
// 出网安全:常量 base 首次请求前经 llm.ValidatePublicBaseURL 校验(进程内缓存)。
// 配置(appId/appSecret)从 sys_oauth_config provider='feishu' 读取,后台可热改。
package feishu

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/pkg/xlogger"
)

const (
	apiBase = "https://open.feishu.cn/open-apis"

	// RootParentID 飞书根部门哨兵:find_by_parent 传 0 表示根下直属部门。
	RootParentID = "0"

	tenantTokenTTL = 6900 * time.Second // 官方 7200s,略短兜底
	httpTimeout    = 10 * time.Second

	deptPageSize    = 50
	userPageSize    = 100
	messagePageSize = 100
)

// Config 飞书配置(从 sys_oauth_config provider='feishu' 读取)。
type Config struct {
	AppID     string
	AppSecret string
}

// Client 飞书 API 客户端。
type Client struct {
	cfg Config
	hc  *http.Client
}

// NewClient 创建飞书客户端。
func NewClient(cfg Config) *Client {
	return &Client{cfg: cfg, hc: &http.Client{Timeout: httpTimeout}}
}

// IsConfigured 检查配置完整性。
func (c *Client) IsConfigured() bool { return c.cfg.AppID != "" && c.cfg.AppSecret != "" }

// baseURLVerified 进程内记录已通过出网校验的 base。
var baseURLVerified sync.Map

// verifyBaseURL 出网前校验 base(公网性,防 SSRF)。常量本身是公网域名,
// 校验失败即代码错误(记录告警,不阻断;真实出网由网络策略兜底)。
func verifyBaseURL(base string) error {
	if _, ok := baseURLVerified.Load(base); ok {
		return nil
	}
	if err := llm.ValidatePublicBaseURL(base); err != nil {
		xlogger.Errorf("feishu base url 校验失败 %s: %v", base, err)
		return err
	}
	baseURLVerified.Store(base, struct{}{})
	return nil
}

// ── tenant_access_token ──

type tenantTokenRequest struct {
	AppID     string `json:"app_id"`
	AppSecret string `json:"app_secret"`
}

type tenantTokenResponse struct {
	Code              int    `json:"code"`
	Msg               string `json:"msg"`
	TenantAccessToken string `json:"tenant_access_token"`
	Expire            int64  `json:"expire"` // 秒
}

type tokenEntry struct {
	token     string
	expiresAt time.Time
}

var tokenMu sync.Mutex
var tokenCache = map[string]tokenEntry{} // key=app_id

// GetTenantToken 获取 tenant_access_token(缓存到期重取)。
func (c *Client) GetTenantToken(ctx context.Context) (string, error) {
	if !c.IsConfigured() {
		return "", fmt.Errorf("飞书未配置(app_id/app_secret 缺失)")
	}
	tokenMu.Lock()
	if e, ok := tokenCache[c.cfg.AppID]; ok && time.Now().Before(e.expiresAt) {
		tokenMu.Unlock()
		return e.token, nil
	}
	tokenMu.Unlock()

	_ = verifyBaseURL(apiBase)
	var resp tenantTokenResponse
	if err := c.httpPostJSON(ctx, apiBase+"/auth/v3/tenant_access_token/internal",
		tenantTokenRequest{AppID: c.cfg.AppID, AppSecret: c.cfg.AppSecret}, &resp, nil); err != nil {
		return "", fmt.Errorf("获取飞书 tenant_access_token 失败: %w", err)
	}
	if resp.Code != 0 || resp.TenantAccessToken == "" {
		return "", fmt.Errorf("飞书返回错误: code=%d msg=%s", resp.Code, resp.Msg)
	}
	ttl := tenantTokenTTL
	if resp.Expire > 0 && time.Duration(resp.Expire)*time.Second < ttl {
		ttl = time.Duration(resp.Expire) * time.Second
	}
	tokenMu.Lock()
	tokenCache[c.cfg.AppID] = tokenEntry{token: resp.TenantAccessToken, expiresAt: time.Now().Add(ttl)}
	tokenMu.Unlock()
	return resp.TenantAccessToken, nil
}

// RefreshTenantToken 强制刷新(配置变更后调用)。
func (c *Client) RefreshTenantToken(ctx context.Context) (string, error) {
	tokenMu.Lock()
	delete(tokenCache, c.cfg.AppID)
	tokenMu.Unlock()
	return c.GetTenantToken(ctx)
}

// ── 通讯录:部门 ──

// Dept 归一化部门(open_department_id 口径)。
type Dept struct {
	OpenID     string `json:"open_department_id"`
	Name       string `json:"name"`
	ParentOpen string `json:"parent_department_id"`
	Order      int    `json:"order"`
}

type departmentItem struct {
	OpenDepartmentID   string `json:"open_department_id"`
	Name               string `json:"name"`
	ParentDepartmentID string `json:"parent_department_id"`
	Order              string `json:"order"`
}

type findByParentResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		HasMore   bool             `json:"has_more"`
		PageToken string           `json:"page_token"`
		Items     []departmentItem `json:"items"`
	} `json:"data"`
}

// ListDepartments 列出某部门的直属子部门(page_token 分页拉完)。
// parentOpenID=RootParentID("0") 表示根。
func (c *Client) ListDepartments(ctx context.Context, parentOpenID string) ([]Dept, error) {
	token, err := c.GetTenantToken(ctx)
	if err != nil {
		return nil, err
	}
	_ = verifyBaseURL(apiBase)
	out := make([]Dept, 0, 16)
	pageToken := ""
	for {
		q := url.Values{}
		q.Set("parent_department_id", parentOpenID)
		q.Set("page_size", fmt.Sprintf("%d", deptPageSize))
		if pageToken != "" {
			q.Set("page_token", pageToken)
		}
		var resp findByParentResponse
		if err := c.httpGetJSON(ctx, apiBase+"/contact/v3/departments/find_by_parent?"+q.Encode(), &resp, authHeader(token)); err != nil {
			return nil, err
		}
		if resp.Code != 0 {
			return nil, fmt.Errorf("飞书返回错误: code=%d msg=%s", resp.Code, resp.Msg)
		}
		for _, it := range resp.Data.Items {
			order, _ := atoiSafe(it.Order)
			out = append(out, Dept{
				OpenID:     it.OpenDepartmentID,
				Name:       it.Name,
				ParentOpen: it.ParentDepartmentID,
				Order:      order,
			})
		}
		if !resp.Data.HasMore || resp.Data.PageToken == "" {
			break
		}
		pageToken = resp.Data.PageToken
	}
	return out, nil
}

// ListAllDepartments 从根迭代拉取全部部门(BFS;不含根哨兵本身)。
func (c *Client) ListAllDepartments(ctx context.Context) ([]Dept, error) {
	all := make([]Dept, 0, 64)
	queue := []string{RootParentID}
	for len(queue) > 0 {
		parent := queue[0]
		queue = queue[1:]
		subs, err := c.ListDepartments(ctx, parent)
		if err != nil {
			return nil, err
		}
		for _, d := range subs {
			all = append(all, d)
			queue = append(queue, d.OpenID)
		}
	}
	return all, nil
}

// ── 通讯录:部门用户 ──

// User 归一化用户(open_id 为主键口径;mobile 需通讯录读权限)。
type User struct {
	OpenID  string   `json:"open_id"`
	UserID  string   `json:"user_id"`
	UnionID string   `json:"union_id"`
	Name    string   `json:"name"`
	Mobile  string   `json:"mobile"`
	Email   string   `json:"email"`
	Depts   []string `json:"department_ids"`
}

type userItem struct {
	OpenID        string   `json:"open_id"`
	UserID        string   `json:"user_id"`
	UnionID       string   `json:"union_id"`
	Name          string   `json:"name"`
	Mobile        string   `json:"mobile"`
	Email         string   `json:"email"`
	DepartmentIDs []string `json:"department_ids"`
}

type findByDeptUserResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		HasMore   bool       `json:"has_more"`
		PageToken string     `json:"page_token"`
		Items     []userItem `json:"items"`
	} `json:"data"`
}

// ListUsersByDept 拉取某部门直属用户(page_token 分页拉完)。
func (c *Client) ListUsersByDept(ctx context.Context, deptOpenID string) ([]User, error) {
	token, err := c.GetTenantToken(ctx)
	if err != nil {
		return nil, err
	}
	_ = verifyBaseURL(apiBase)
	out := make([]User, 0, 16)
	pageToken := ""
	for {
		q := url.Values{}
		q.Set("department_id", deptOpenID)
		q.Set("page_size", fmt.Sprintf("%d", userPageSize))
		q.Set("user_id_type", "open_id")
		q.Set("department_id_type", "open_department_id")
		if pageToken != "" {
			q.Set("page_token", pageToken)
		}
		var resp findByDeptUserResponse
		if err := c.httpGetJSON(ctx, apiBase+"/contact/v3/users/find_by_department?"+q.Encode(), &resp, authHeader(token)); err != nil {
			return nil, err
		}
		if resp.Code != 0 {
			return nil, fmt.Errorf("飞书返回错误: code=%d msg=%s", resp.Code, resp.Msg)
		}
		for _, it := range resp.Data.Items {
			out = append(out, User{
				OpenID:  it.OpenID,
				UserID:  it.UserID,
				UnionID: it.UnionID,
				Name:    it.Name,
				Mobile:  it.Mobile,
				Email:   it.Email,
				Depts:   it.DepartmentIDs,
			})
		}
		if !resp.Data.HasMore || resp.Data.PageToken == "" {
			break
		}
		pageToken = resp.Data.PageToken
	}
	return out, nil
}

// ── 消息推送 ──

type sendMessageRequest struct {
	ReceiveID string `json:"receive_id"`
	MsgType   string `json:"msg_type"`
	Content   string `json:"content"` // JSON 字符串:{"text":"..."}
}

type sendMessageResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		MessageID string `json:"message_id"`
	} `json:"data"`
}

// messageContent 组装 im/v1/messages 的 content(JSON 字符串 {"text":"..."},契约要求)。
func messageContent(text string) string {
	b, _ := json.Marshal(map[string]string{"text": text})
	return string(b)
}

// SendUserMessage 发送文本消息给单个用户(open_id)。
func (c *Client) SendUserMessage(ctx context.Context, openID, text string) error {
	if !c.IsConfigured() {
		return fmt.Errorf("飞书未配置(app_id/app_secret 缺失)")
	}
	token, err := c.GetTenantToken(ctx)
	if err != nil {
		return err
	}
	_ = verifyBaseURL(apiBase)
	body := sendMessageRequest{ReceiveID: openID, MsgType: "text", Content: messageContent(text)}
	var resp sendMessageResponse
	if err := c.httpPostJSON(ctx, apiBase+"/im/v1/messages?receive_id_type=open_id", body, &resp, authHeader(token)); err != nil {
		return fmt.Errorf("飞书消息发送失败: %w", err)
	}
	if resp.Code != 0 {
		return fmt.Errorf("飞书返回错误: code=%d msg=%s", resp.Code, resp.Msg)
	}
	return nil
}

// ── 扫码登录 ──

// GetQRLoginURL 构造飞书网页授权(扫码)URL。
// redirectURI 为本系统回调端点(/enterprise/oauth/feishu/callback 的公网地址),
// 必须与飞书开放平台应用的重定向 URL 配置一致;state 用于防 CSRF。
func (c *Client) GetQRLoginURL(state, redirectURI string) string {
	q := url.Values{}
	q.Set("app_id", c.cfg.AppID)
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", "code")
	q.Set("state", state)
	return apiBase + "/authen/v1/authorize?" + q.Encode()
}

type oidcTokenRequest struct {
	GrantType string `json:"grant_type"`
	Code      string `json:"code"`
}

type oidcTokenResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		AccessToken string `json:"access_token"`
	} `json:"data"`
}

type userInfoResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		Name    string `json:"name"`
		OpenID  string `json:"open_id"`
		UnionID string `json:"union_id"`
		UserID  string `json:"user_id"`
	} `json:"data"`
}

// QrUser 扫码登录归一化用户。
type QrUser struct {
	OpenID   string
	UnionID  string
	Nickname string
}

// GetUserInfoByCode 扫码授权 code → 用户身份(open_id/nickname)。
// 步骤:code 换 user_access_token → /authen/v1/user_info 读用户信息。
func (c *Client) GetUserInfoByCode(ctx context.Context, code string) (*QrUser, error) {
	_ = verifyBaseURL(apiBase)
	tenantToken, err := c.GetTenantToken(ctx)
	if err != nil {
		return nil, err
	}
	var tokenResp oidcTokenResponse
	if err := c.httpPostJSON(ctx, apiBase+"/authen/v1/oidc/access_token",
		oidcTokenRequest{GrantType: "authorization_code", Code: code}, &tokenResp, authHeader(tenantToken)); err != nil {
		return nil, fmt.Errorf("飞书授权失败: %w", err)
	}
	if tokenResp.Code != 0 || tokenResp.Data.AccessToken == "" {
		return nil, fmt.Errorf("飞书授权失败: code=%d msg=%s", tokenResp.Code, tokenResp.Msg)
	}

	var info userInfoResponse
	if err := c.httpGetJSON(ctx, apiBase+"/authen/v1/user_info", &info,
		map[string]string{"Authorization": "Bearer " + tokenResp.Data.AccessToken}); err != nil {
		return nil, fmt.Errorf("读取飞书用户信息失败: %w", err)
	}
	if info.Code != 0 {
		return nil, fmt.Errorf("飞书返回错误: code=%d msg=%s", info.Code, info.Msg)
	}
	return &QrUser{OpenID: info.Data.OpenID, UnionID: info.Data.UnionID, Nickname: info.Data.Name}, nil
}

// ── HTTP 工具 ──

func authHeader(token string) map[string]string {
	return map[string]string{"Authorization": "Bearer " + token}
}

// atoiSafe 十进制字符串 → int(失败返回 0)。
func atoiSafe(s string) (int, bool) {
	v, err := strconvParseInt(s)
	return v, err == nil
}

func strconvParseInt(s string) (int, error) {
	var v int
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0, fmt.Errorf("非数字")
		}
		v = v*10 + int(ch-'0')
	}
	return v, nil
}

func (c *Client) httpPostJSON(ctx context.Context, u string, body, target any, hdr map[string]string) error {
	jsonBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	return c.doJSON(req, target)
}

func (c *Client) httpGetJSON(ctx context.Context, u string, target any, hdr map[string]string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	return c.doJSON(req, target)
}

func (c *Client) doJSON(req *http.Request, target any) error {
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
