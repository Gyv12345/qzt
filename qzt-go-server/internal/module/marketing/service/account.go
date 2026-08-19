// Package service 营销模块服务:渠道账号管理 + OAuth 授权 + 飞鱼线索同步。
package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	"qzt-go-server/internal/app"
	mktmodel "qzt-go-server/internal/model/marketing"
	"qzt-go-server/internal/pkg/oceanengine"
	mktrepo "qzt-go-server/internal/repository/marketing"
)

// account.go 渠道账号服务:CRUD + OAuth 授权链接/回调。
//
// OAuth 流程(照抄企微绑定流程的 state 模式):
//  1. AuthorizeURL 生成 state=mkt_{accountID}_{rand} 存 Redis(5 分钟),返回巨量授权链接
//  2. 广告主在巨量授权页确认 → 巨量回调 /marketing/oauth/callback?auth_code=..&state=..
//  3. HandleOAuthCallback 用 GetDel 原子消费 state 取回账号 ID → 换 token 落库
// state 过期/重复回调直接失败,不产生副作用。

const (
	oauthStatePrefix = "qzt:marketing:oauth:"
	oauthStateTTL    = 5 * time.Minute
)

// AccountService 渠道账号服务。
type AccountService struct {
	repo *mktrepo.AccountRepo
}

func NewAccountService() *AccountService {
	return &AccountService{repo: mktrepo.NewAccountRepo()}
}

// ── CRUD ──

// AccountPayload 新增/编辑渠道账号。
type AccountPayload struct {
	Name      string `json:"name" binding:"required,max=100"`
	AppID     string `json:"app_id" binding:"required,max=64"`
	AppSecret string `json:"app_secret" binding:"max=128"` // 编辑留空=保留原值
}

// List 列出全部渠道账号(数量级小,不分页)。
func (s *AccountService) List(ctx context.Context) ([]mktmodel.MarketingAccount, error) {
	return s.repo.List(ctx, nil)
}

// Create 新增账号(状态=待授权)。
func (s *AccountService) Create(ctx context.Context, req *AccountPayload) (*mktmodel.MarketingAccount, error) {
	if req.AppSecret == "" {
		return nil, errors.New("请填写应用 Secret")
	}
	account := &mktmodel.MarketingAccount{
		Name:      req.Name,
		Channel:   mktmodel.ChannelOceanEngine,
		AppID:     req.AppID,
		AppSecret: req.AppSecret,
		Status:    mktmodel.AccountStatusPending,
		Enabled:   1,
	}
	if err := s.repo.Create(ctx, account); err != nil {
		return nil, err
	}
	return account, nil
}

// Update 编辑账号。AppSecret 留空保留原值;
// AppID/AppSecret 变化会使已授权 token 失效,重置回待授权。
func (s *AccountService) Update(ctx context.Context, id uint, req *AccountPayload) error {
	account, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("账号不存在")
	}
	credentialChanged := account.AppID != req.AppID || (req.AppSecret != "" && req.AppSecret != account.AppSecret)
	account.Name = req.Name
	account.AppID = req.AppID
	if req.AppSecret != "" {
		account.AppSecret = req.AppSecret
	}
	if credentialChanged {
		account.Status = mktmodel.AccountStatusPending
		account.AccessToken = ""
		account.RefreshToken = ""
		account.TokenExpiresAt = nil
		account.RefreshExpiresAt = nil
		account.AdvertiserIDs = ""
	}
	return s.repo.Update(ctx, account)
}

// SetEnabled 启用/停用账号(停用后定时任务跳过)。
func (s *AccountService) SetEnabled(ctx context.Context, id uint, enabled int8) error {
	account, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("账号不存在")
	}
	account.Enabled = enabled
	return s.repo.Update(ctx, account)
}

// Delete 删除账号(软删;同步日志保留可查)。
func (s *AccountService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

// ── OAuth 授权 ──

// AuthorizeURL 生成巨量授权链接。
// redirectURI 由前端按当前后台域名推导(私有化部署不写死域名),
// 必须与开放平台应用里登记的授权回调域一致,否则巨量侧报错。
func (s *AccountService) AuthorizeURL(ctx context.Context, id uint, redirectURI string) (string, error) {
	if redirectURI == "" {
		return "", errors.New("缺少授权回调地址(redirect_uri)")
	}
	account, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", errors.New("账号不存在")
	}
	state := fmt.Sprintf("mkt_%d_%s", id, randomHex(8))
	if err := app.Redis.Set(ctx, oauthStatePrefix+state, strconv.FormatUint(uint64(id), 10), oauthStateTTL).Err(); err != nil {
		return "", fmt.Errorf("生成授权状态失败: %w", err)
	}
	client := oceanengine.NewClient(oceanengine.Config{AppID: account.AppID, AppSecret: account.AppSecret})
	return client.BuildAuthorizeURL(redirectURI, state), nil
}

// HandleOAuthCallback 处理巨量回调:校验 state → 换 token → 落库。
// 返回错误信息供回调页展示;成功返回空串。
func (s *AccountService) HandleOAuthCallback(ctx context.Context, authCode, state string) string {
	if authCode == "" || state == "" {
		return "回调参数缺失(auth_code/state)"
	}
	// GetDel 原子消费:防止重复回调/伪造 state
	idStr, err := app.Redis.GetDel(ctx, oauthStatePrefix+state).Result()
	if err != nil || idStr == "" {
		return "授权状态已失效,请回后台重新发起授权"
	}
	accountID, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return "授权状态数据异常"
	}
	account, err := s.repo.GetByID(ctx, uint(accountID))
	if err != nil {
		return "账号不存在或已删除"
	}

	client := oceanengine.NewClient(oceanengine.Config{AppID: account.AppID, AppSecret: account.AppSecret})
	bundle, err := client.GetTokenByAuthCode(ctx, authCode)
	if err != nil {
		return "换取访问令牌失败: " + err.Error()
	}
	// token 响应未带广告主列表时兜底拉一次
	advertiserIDs := bundle.AdvertiserIDs
	if len(advertiserIDs) == 0 {
		if ids, err := client.GetAdvertisers(ctx, bundle.AccessToken); err == nil {
			advertiserIDs = ids
		}
	}

	now := time.Now()
	tokenExpires := now.Add(time.Duration(bundle.ExpiresIn) * time.Second)
	refreshExpires := now.Add(time.Duration(bundle.RefreshExpiresIn) * time.Second)
	tokenAt := toDateTimePtr(tokenExpires)
	refreshAt := toDateTimePtr(refreshExpires)

	account.AccessToken = bundle.AccessToken
	account.RefreshToken = bundle.RefreshToken
	account.TokenExpiresAt = tokenAt
	account.RefreshExpiresAt = refreshAt
	account.AdvertiserIDs = joinIDs(advertiserIDs)
	account.Status = mktmodel.AccountStatusAuthed
	if err := s.repo.Update(ctx, account); err != nil {
		return "保存授权信息失败: " + err.Error()
	}
	return ""
}

// randomHex 生成 n 字节的随机 hex 字符串(共 2n 字符)。
func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(b)
}
