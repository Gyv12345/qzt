// Package dingtalk 封装钉钉服务端 API 调用(P32 通讯录同步/扫码登录/工作通知)。
//
// token:POST https://api.dingtalk.com/v1.0/oauth2/accessToken,包内缓存到期重取。
// 通讯录:旧版 topapi v2(/topapi/v2/department/listsub、/topapi/v2/user/list、
//
//	/topapi/v2/user/get)从根部门 dept_id=1 递归拉取。
//
// 工作通知:/topapi/message/corpconversation/asyncsend_v2(agent_id 来自配置)。
// 扫码登录:统一授权页 https://login.dingtalk.com/oauth2/auth(PC 打开即出二维码),
//
//	code → /v1.0/oauth2/userAccessToken → /v1.0/contact/users/me 换 unionid/nickname。
//
// 出网安全:两个常量 base 在首次请求前经 llm.ValidatePublicBaseURL 校验(进程内缓存)。
// 配置(appKey/appSecret/agent_id)从 sys_oauth_config provider='dingtalk' 读取,后台可热改。
package dingtalk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/pkg/xlogger"
)

const (
	apiBase  = "https://api.dingtalk.com"  // 新版 v1.0 API(token/用户身份)
	oapiBase = "https://oapi.dingtalk.com" // 旧版 topapi(通讯录/工作通知)

	// RootDeptID 钉钉根部门固定 dept_id=1(通讯录递归入口,不落本地表)。
	RootDeptID int64 = 1

	accessTokenTTL = 7000 * time.Second // 官方 7200s,略短兜底
	httpTimeout    = 10 * time.Second

	// deptPageSize 部门列表接口无分页(单次返回全部直属子部门),用户列表分页大小。
	userPageSize = 100
)

// Config 钉钉配置(从 sys_oauth_config provider='dingtalk' 读取:
// AppID=appKey,AppSecret=appSecret,Extra.agent_id=agentID)。
type Config struct {
	AppKey    string
	AppSecret string
	AgentID   string
}

// Client 钉钉 API 客户端。
type Client struct {
	cfg Config
	hc  *http.Client
}

// NewClient 创建钉钉客户端。
func NewClient(cfg Config) *Client {
	return &Client{cfg: cfg, hc: &http.Client{Timeout: httpTimeout}}
}

// IsConfigured 检查配置完整性(appKey/appSecret 非空)。
func (c *Client) IsConfigured() bool { return c.cfg.AppKey != "" && c.cfg.AppSecret != "" }

// baseURLVerified 进程内记录已通过出网校验的 base,避免每次请求重复 DNS 解析。
var baseURLVerified sync.Map

// verifyBaseURL 出网前校验 base(公网性,防 SSRF)。常量本身是公网域名,
// 校验失败即代码错误(记录告警,不阻断;真实出网由网络策略兜底)。
func verifyBaseURL(base string) error {
	if _, ok := baseURLVerified.Load(base); ok {
		return nil
	}
	if err := llm.ValidatePublicBaseURL(base); err != nil {
		xlogger.Errorf("dingtalk base url 校验失败 %s: %v", base, err)
		return err
	}
	baseURLVerified.Store(base, struct{}{})
	return nil
}

// ── access_token ──

// tokenClient 内存缓存 {client 指针哈希不可用,按 appKey 派生}:全局 map + mutex,
// value 含过期时间。同一进程内多 Client(如同步与登录)共享 appKey 的 token。
type tokenEntry struct {
	token     string
	expiresAt time.Time
}

var (
	tokenMu      sync.Mutex
	tokenCache   = map[string]tokenEntry{}
	tokenRefresh sync.Map // 防并发重复取 token:key=appKey → struct{}
)

type accessTokenRequest struct {
	AppKey    string `json:"appKey"`
	AppSecret string `json:"appSecret"`
}

type accessTokenResponse struct {
	AccessToken string `json:"accessToken"`
	ExpireIn    int64  `json:"expireIn"` // 秒
}

// GetToken 获取企业内部应用 access_token(缓存到期重取)。
func (c *Client) GetToken(ctx context.Context) (string, error) {
	if !c.IsConfigured() {
		return "", fmt.Errorf("钉钉未配置(appKey/appSecret 缺失)")
	}
	tokenMu.Lock()
	if e, ok := tokenCache[c.cfg.AppKey]; ok && time.Now().Before(e.expiresAt) {
		tokenMu.Unlock()
		return e.token, nil
	}
	tokenMu.Unlock()

	_ = verifyBaseURL(apiBase)
	var resp accessTokenResponse
	body := accessTokenRequest{AppKey: c.cfg.AppKey, AppSecret: c.cfg.AppSecret}
	if err := c.httpPostJSON(ctx, apiBase+"/v1.0/oauth2/accessToken", body, &resp, nil); err != nil {
		return "", fmt.Errorf("获取钉钉 access_token 失败: %w", err)
	}
	if resp.AccessToken == "" {
		return "", fmt.Errorf("钉钉 access_token 为空")
	}

	ttl := accessTokenTTL
	if resp.ExpireIn > 0 && time.Duration(resp.ExpireIn)*time.Second < ttl {
		ttl = time.Duration(resp.ExpireIn) * time.Second
	}
	tokenMu.Lock()
	tokenCache[c.cfg.AppKey] = tokenEntry{token: resp.AccessToken, expiresAt: time.Now().Add(ttl)}
	tokenMu.Unlock()
	return resp.AccessToken, nil
}

// RefreshToken 强制刷新(配置变更后调用)。
func (c *Client) RefreshToken(ctx context.Context) (string, error) {
	tokenMu.Lock()
	delete(tokenCache, c.cfg.AppKey)
	tokenMu.Unlock()
	return c.GetToken(ctx)
}

// ── 通讯录:部门 ──

// Dept 归一化部门。
type Dept struct {
	DeptID   int64  `json:"dept_id"`
	Name     string `json:"name"`
	ParentID int64  `json:"parent_id"`
}

type listSubDeptResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	Result  []struct {
		DeptID   int64  `json:"dept_id"`
		Name     string `json:"name"`
		ParentID int64  `json:"parent_id"`
	} `json:"result"`
}

// listSubDeptIDs 拉取某部门的直属子部门(topapi/v2/department/listsub,无分页)。
func (c *Client) listSubDepts(ctx context.Context, deptID int64) ([]Dept, error) {
	token, err := c.GetToken(ctx)
	if err != nil {
		return nil, err
	}
	_ = verifyBaseURL(oapiBase)
	body := map[string]any{"dept_id": deptID}
	var resp listSubDeptResponse
	if err := c.httpPostJSON(ctx, oapiBase+"/topapi/v2/department/listsub?access_token="+url.QueryEscape(token), body, &resp, nil); err != nil {
		return nil, err
	}
	if resp.ErrCode != 0 {
		return nil, fmt.Errorf("钉钉返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	out := make([]Dept, 0, len(resp.Result))
	for _, d := range resp.Result {
		out = append(out, Dept{DeptID: d.DeptID, Name: d.Name, ParentID: d.ParentID})
	}
	return out, nil
}

// ListDepartments 从根部门(dept_id=1)递归拉取全部部门(BFS,含各级;不含根部门本身)。
func (c *Client) ListDepartments(ctx context.Context) ([]Dept, error) {
	all := make([]Dept, 0, 64)
	queue := []int64{RootDeptID}
	for len(queue) > 0 {
		parent := queue[0]
		queue = queue[1:]
		subs, err := c.listSubDepts(ctx, parent)
		if err != nil {
			return nil, err
		}
		for _, d := range subs {
			all = append(all, d)
			queue = append(queue, d.DeptID)
		}
	}
	return all, nil
}

// ── 通讯录:部门用户 ──

// UserBrief 部门用户简表(v2/user/list 返回字段裁剪;mobile 需通讯录读权限)。
type UserBrief struct {
	UserID        string  `json:"userid"`
	UnionID       string  `json:"unionid"`
	Name          string  `json:"name"`
	Mobile        string  `json:"mobile"`
	DeptIDList    []int64 `json:"dept_id_list"`
	DeptOrderList []int64 `json:"dept_order_list,omitempty"`
}

type listDeptUserResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	Result  struct {
		HasMore    bool        `json:"has_more"`
		NextCursor int64       `json:"next_cursor"`
		List       []UserBrief `json:"list"`
	} `json:"result"`
}

// ListDeptUsers 拉取某部门直属用户(cursor 分页拉完)。
func (c *Client) ListDeptUsers(ctx context.Context, deptID int64) ([]UserBrief, error) {
	token, err := c.GetToken(ctx)
	if err != nil {
		return nil, err
	}
	_ = verifyBaseURL(oapiBase)
	out := make([]UserBrief, 0, 32)
	cursor := int64(0)
	for {
		body := map[string]any{"dept_id": deptID, "cursor": cursor, "size": userPageSize}
		var resp listDeptUserResponse
		if err := c.httpPostJSON(ctx, oapiBase+"/topapi/v2/user/list?access_token="+url.QueryEscape(token), body, &resp, nil); err != nil {
			return nil, err
		}
		if resp.ErrCode != 0 {
			return nil, fmt.Errorf("钉钉返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
		}
		out = append(out, resp.Result.List...)
		if !resp.Result.HasMore {
			break
		}
		cursor = resp.Result.NextCursor
	}
	return out, nil
}

// ── 通讯录:用户详情 ──

// UserDetail 用户详情(v2/user/get;mobile 需权限)。
type UserDetail struct {
	UserID     string  `json:"userid"`
	UnionID    string  `json:"unionid"`
	Name       string  `json:"name"`
	Mobile     string  `json:"mobile"`
	Email      string  `json:"email"`
	Avatar     string  `json:"avatar"`
	Title      string  `json:"title"`
	Active     bool    `json:"active"`
	DeptIDList []int64 `json:"dept_id_list"`
}

type getUserDetailResponse struct {
	ErrCode int         `json:"errcode"`
	ErrMsg  string      `json:"errmsg"`
	Result  *UserDetail `json:"result"`
}

// GetUserDetail 按 userid 拉取用户详情(含 mobile)。
func (c *Client) GetUserDetail(ctx context.Context, userid string) (*UserDetail, error) {
	token, err := c.GetToken(ctx)
	if err != nil {
		return nil, err
	}
	_ = verifyBaseURL(oapiBase)
	var resp getUserDetailResponse
	if err := c.httpPostJSON(ctx, oapiBase+"/topapi/v2/user/get?access_token="+url.QueryEscape(token),
		map[string]any{"userid": userid}, &resp, nil); err != nil {
		return nil, err
	}
	if resp.ErrCode != 0 {
		return nil, fmt.Errorf("钉钉返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	if resp.Result == nil {
		return nil, fmt.Errorf("钉钉用户不存在: %s", userid)
	}
	return resp.Result, nil
}

// ── 工作通知 ──

type workNoticeMsg struct {
	MsgType string      `json:"msgtype"`
	Text    *noticeText `json:"text,omitempty"`
}

type noticeText struct {
	Content string `json:"content"`
}

type sendWorkNoticeRequest struct {
	AgentID    string        `json:"agent_id"`
	ToAllUser  bool          `json:"to_all_user,omitempty"`
	UserIDList string        `json:"userid_list"` // 竖线分隔,≤100
	Msg        workNoticeMsg `json:"msg"`
}

type sendWorkNoticeResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	TaskID  int64  `json:"task_id"`
}

// SendWorkNotice 发送工作通知(text)给多个钉钉用户(userid_list,竖线分隔)。
func (c *Client) SendWorkNotice(ctx context.Context, useridList, content string) error {
	if !c.IsConfigured() || c.cfg.AgentID == "" {
		return fmt.Errorf("钉钉工作通知未配置(appKey/appSecret/agent_id 缺失)")
	}
	token, err := c.GetToken(ctx)
	if err != nil {
		return err
	}
	_ = verifyBaseURL(oapiBase)
	body := sendWorkNoticeRequest{
		AgentID:    c.cfg.AgentID,
		UserIDList: useridList,
		Msg:        workNoticeMsg{MsgType: "text", Text: &noticeText{Content: content}},
	}
	var resp sendWorkNoticeResponse
	if err := c.httpPostJSON(ctx, oapiBase+"/topapi/message/corpconversation/asyncsend_v2?access_token="+url.QueryEscape(token), body, &resp, nil); err != nil {
		return fmt.Errorf("钉钉工作通知发送失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return fmt.Errorf("钉钉返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	return nil
}

// ── 扫码登录 ──

// GetQRConnectURL 构造钉钉统一扫码授权页 URL(PC 浏览器打开即渲染二维码)。
// redirectURI 为本系统回调端点(/enterprise/oauth/dingtalk/callback 的公网地址),
// 必须与钉钉开放平台应用配置一致;state 用于防 CSRF,由调用方生成。
func (c *Client) GetQRConnectURL(state, redirectURI string) string {
	q := url.Values{}
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", "code")
	q.Set("client_id", c.cfg.AppKey)
	q.Set("scope", "openid")
	q.Set("state", state)
	q.Set("prompt", "consent")
	return "https://login.dingtalk.com/oauth2/auth?" + q.Encode()
}

type userAccessTokenRequest struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	Code         string `json:"code"`
	GrantType    string `json:"grantType"`
}

type userAccessTokenResponse struct {
	AccessToken string `json:"accessToken"`
	UnionID     string `json:"unionId"`
	ErrMsg      string `json:"message"`
}

type contactMeResponse struct {
	NickName string `json:"nickName"`
	UnionID  string `json:"unionId"`
	OpenID   string `json:"openId"`
	Mobile   string `json:"mobile"`
	Avatar   string `json:"avatarUrl"`
}

// QrUser 扫码登录归一化用户。
type QrUser struct {
	UnionID  string
	OpenID   string
	Nickname string
	Mobile   string // 个人信息授权后才可见,可能为空(脱敏)
	Avatar   string
}

// GetUserInfoByCode 扫码授权 code → 用户身份(unionid/nickname)。
// 步骤:code 换 user_access_token → /v1.0/contact/users/me 读用户信息。
func (c *Client) GetUserInfoByCode(ctx context.Context, code, redirectURI string) (*QrUser, error) {
	_ = verifyBaseURL(apiBase)
	body := userAccessTokenRequest{
		ClientID:     c.cfg.AppKey,
		ClientSecret: c.cfg.AppSecret,
		Code:         code,
		GrantType:    "authorization_code",
	}
	var tokenResp userAccessTokenResponse
	if err := c.httpPostJSON(ctx, apiBase+"/v1.0/oauth2/userAccessToken", body, &tokenResp, nil); err != nil {
		return nil, fmt.Errorf("钉钉授权失败: %w", err)
	}
	if tokenResp.AccessToken == "" {
		return nil, fmt.Errorf("钉钉授权失败: %s", tokenResp.ErrMsg)
	}

	var me contactMeResponse
	hdr := map[string]string{"x-dingtalk-access-token": tokenResp.AccessToken}
	if err := c.httpGetJSON(ctx, apiBase+"/v1.0/contact/users/me", &me, hdr); err != nil {
		return nil, fmt.Errorf("读取钉钉用户信息失败: %w", err)
	}
	if me.UnionID == "" {
		me.UnionID = tokenResp.UnionID
	}
	return &QrUser{
		UnionID:  me.UnionID,
		OpenID:   me.OpenID,
		Nickname: me.NickName,
		Mobile:   me.Mobile,
		Avatar:   me.Avatar,
	}, nil
}

type getByUnionIDResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	Result  struct {
		UserID string `json:"userid"`
	} `json:"result"`
}

// GetUserIDByUnionID 按 unionid 换企业内 userid(扫码登录匹配 external_id 用)。
func (c *Client) GetUserIDByUnionID(ctx context.Context, unionID string) (string, error) {
	token, err := c.GetToken(ctx)
	if err != nil {
		return "", err
	}
	_ = verifyBaseURL(oapiBase)
	var resp getByUnionIDResponse
	if err := c.httpPostJSON(ctx, oapiBase+"/topapi/user/getbyunionid?access_token="+url.QueryEscape(token),
		map[string]any{"unionid": unionID}, &resp, nil); err != nil {
		return "", err
	}
	if resp.ErrCode != 0 {
		return "", fmt.Errorf("钉钉返回错误: errcode=%d errmsg=%s", resp.ErrCode, resp.ErrMsg)
	}
	if resp.Result.UserID == "" {
		return "", fmt.Errorf("该钉钉用户不在当前企业通讯录内")
	}
	return resp.Result.UserID, nil
}

// FormatInt64 int64 → 字符串(通讯录外部 id 落库/对账统一字符串口径)。
func FormatInt64(v int64) string { return strconv.FormatInt(v, 10) }

// ── HTTP 工具 ──

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
