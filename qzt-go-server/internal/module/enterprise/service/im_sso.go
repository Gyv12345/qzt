package service

// im_sso.go 钉钉/飞书扫码登录服务(P32,login-only,不进 RBAC,照企微 OAuth 口径)。
//
// 流程:
//  GET /enterprise/oauth/<platform>/qr
//      → 生成 state 存 Redis(防 CSRF,5 分钟一次性)
//      → 302 平台扫码授权页(redirect_uri=本系统回调端点公网地址)
//  GET /enterprise/oauth/<platform>/callback?code=..&state=..
//      → 校验 state(GetDel 一次性) → code 换用户身份
//      → 匹配本地用户(外部id绑定 > 手机号精确 > 自动创建,口径与通讯录同步一致)
//      → 签发 JWT → 302 admin 首页回调页 /#/oauth/callback?token=..
//
// 回调地址推导:取 sys_oauth_config.redirect_uri 的 origin + /prod-api/enterprise/
// oauth/<platform>/callback——生产 admin/主域均已反代 /prod-api 到本服务,
// 本地 dev 由 vite proxy 转发;平台侧应用需把该完整地址登记为重定向/回调域名。

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"gorm.io/gorm"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/dingtalk"
	"qzt-go-server/internal/pkg/feishu"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xcryption"
)

// ImSSOService 钉钉/飞书扫码登录服务。
type ImSSOService struct {
	oauthRepo *repository.OauthConfigRepo
	userRepo  *repository.UserRepo
}

func NewImSSOService() *ImSSOService {
	return &ImSSOService{
		oauthRepo: repository.NewOauthConfigRepo(),
		userRepo:  repository.NewUserRepo(),
	}
}

// ssoStateKey 扫码登录 state 的 Redis key。
func ssoStateKey(platform, state string) string {
	return "qzt:im-sso:" + platform + ":" + state
}

const ssoStateTTL = 5 * time.Minute

// callbackPathSuffix 本系统各平台回调端点路径(挂 /prod-api 前缀后的完整路径)。
func callbackPathSuffix(platform string) string {
	return "/prod-api/enterprise/oauth/" + platform + "/callback"
}

// GetQRAuthorizeURL 构造平台扫码授权页 URL(302 跳转用)。
func (s *ImSSOService) GetQRAuthorizeURL(ctx context.Context, platform string) (string, error) {
	cfg, err := s.oauthRepo.GetEnabledByProvider(ctx, providerOf(platform))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", fmt.Errorf("%s扫码登录未启用,请在「第三方应用」中启用配置", platformLabel(platform))
		}
		return "", fmt.Errorf("读取%s配置失败: %w", platformLabel(platform), err)
	}
	origin, err := redirectOrigin(cfg.RedirectURI)
	if err != nil {
		return "", err
	}
	state := randomHex(16)
	if store := cache.GetStore(); store != nil {
		_ = store.Set(ssoStateKey(platform, state), "1", ssoStateTTL)
	}
	callback := origin + callbackPathSuffix(platform)

	switch platform {
	case model.IDSourceDingtalk:
		client := dingtalk.NewClient(dingtalk.Config{AppKey: cfg.AppID, AppSecret: cfg.AppSecret})
		if !client.IsConfigured() {
			return "", errors.New("钉钉配置不完整(app_key/app_secret 未填写)")
		}
		return client.GetQRConnectURL(state, callback), nil
	case model.IDSourceFeishu:
		client := feishu.NewClient(feishu.Config{AppID: cfg.AppID, AppSecret: cfg.AppSecret})
		if !client.IsConfigured() {
			return "", errors.New("飞书配置不完整(app_id/app_secret 未填写)")
		}
		return client.GetQRLoginURL(state, callback), nil
	default:
		return "", fmt.Errorf("不支持的平台: %s", platform)
	}
}

// randomHex 生成 n 字节随机 hex 字符串(共 2n 字符;SSO state 用)。
func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// ConsumeState 校验并消费一次性 state(防 CSRF/重放)。非法返回 false。
func (s *ImSSOService) ConsumeState(platform, state string) bool {
	if state == "" {
		return false
	}
	store := cache.GetStore()
	if store == nil {
		return false
	}
	val, err := store.Get(ssoStateKey(platform, state))
	if err != nil || val == "" {
		return false
	}
	_ = store.Del(ssoStateKey(platform, state))
	return true
}

// CallbackRedirect 处理回调全流程并合成 302 目标:
// 成功 → origin + /#/oauth/callback?token=<jwt>;失败 → origin + /#/oauth/callback?error=<文案>。
// 前端登录页暂未处理 token query,回调页由前端任务补(见 P32 前端任务)。
func (s *ImSSOService) CallbackRedirect(ctx context.Context, platform, code, state string) (target string, userID uint, username string, err error) {
	origin := ""
	if cfg, cerr := s.oauthRepo.GetByProvider(ctx, providerOf(platform)); cerr == nil {
		origin, _ = redirectOrigin(cfg.RedirectURI)
	}
	fail := func(msg string) (string, uint, string, error) {
		if origin == "" {
			return "", 0, "", errors.New(msg)
		}
		return origin + ssoCallbackPage() + "error=" + url.QueryEscape(msg), 0, "", errors.New(msg)
	}
	if !s.ConsumeState(platform, state) {
		return fail("登录状态已过期或无效,请重新扫码")
	}
	token, user, lerr := s.loginWithCode(ctx, platform, code)
	if lerr != nil {
		return fail(lerr.Error())
	}
	if origin == "" {
		return "", 0, "", errors.New("回调地址配置无效,无法跳转回页面")
	}
	return origin + ssoCallbackPage() + "token=" + url.QueryEscape(token), user.ID, user.Username, nil
}

// ssoCallbackPage admin 前端扫码回调页(hash 路由口径)。
func ssoCallbackPage() string { return "/#/oauth/callback?" }

// loginWithCode code 换身份 → 匹配/自动创建 → 签发 JWT。
func (s *ImSSOService) loginWithCode(ctx context.Context, platform, code string) (string, *model.SysUser, error) {
	cfg, err := s.oauthRepo.GetEnabledByProvider(ctx, providerOf(platform))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, fmt.Errorf("%s扫码登录未启用", platformLabel(platform))
		}
		return "", nil, fmt.Errorf("读取%s配置失败: %w", platformLabel(platform), err)
	}

	var extUser *ResolvedSSOUser
	switch platform {
	case model.IDSourceDingtalk:
		client := dingtalk.NewClient(dingtalk.Config{AppKey: cfg.AppID, AppSecret: cfg.AppSecret})
		qr, err := client.GetUserInfoByCode(ctx, code, "")
		if err != nil {
			return "", nil, err
		}
		if qr.UnionID == "" {
			return "", nil, errors.New("钉钉授权未返回 unionid")
		}
		// unionid → 企业内 userid(通讯录边界校验:非本企业成员拒绝登录)
		userid, err := client.GetUserIDByUnionID(ctx, qr.UnionID)
		if err != nil {
			return "", nil, err
		}
		extUser = &ResolvedSSOUser{ExternalID: userid, Name: qr.Nickname, Mobile: qr.Mobile}
	case model.IDSourceFeishu:
		client := feishu.NewClient(feishu.Config{AppID: cfg.AppID, AppSecret: cfg.AppSecret})
		qr, err := client.GetUserInfoByCode(ctx, code)
		if err != nil {
			return "", nil, err
		}
		if qr.OpenID == "" {
			return "", nil, errors.New("飞书授权未返回 open_id")
		}
		extUser = &ResolvedSSOUser{ExternalID: qr.OpenID, Name: qr.Nickname}
	default:
		return "", nil, fmt.Errorf("不支持的平台: %s", platform)
	}

	user, err := s.resolveOrCreateUser(ctx, platform, extUser)
	if err != nil {
		return "", nil, err
	}
	if user.Status != 1 {
		return "", nil, errors.New("用户已被禁用")
	}

	tokens, err := app.JwtManager.GenerateTokens(int32(user.ID), user.Username, user.TokenVersion)
	if err != nil {
		return "", nil, errors.New("生成 Token 失败")
	}
	return tokens.AccessToken, user, nil
}

// ResolvedSSOUser 扫码授权归一化身份。
type ResolvedSSOUser struct {
	ExternalID string // 钉钉 userid / 飞书 open_id
	Name       string
	Mobile     string // 授权范围可能不含,空则跳过手机号匹配
}

// resolveOrCreateUser 匹配本地用户:外部id绑定 > 手机号精确 > 自动创建。
// 自动创建口径与通讯录同步一致(username=手机号[被占则平台前缀],随机初始密码,remark 标来源)。
func (s *ImSSOService) resolveOrCreateUser(ctx context.Context, platform string, u *ResolvedSSOUser) (*model.SysUser, error) {
	// 1. 外部 id 绑定
	if user, err := s.userRepo.GetByExternalID(ctx, platform, u.ExternalID); err == nil {
		return user, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("查询用户失败: %w", err)
	}
	// 2. 手机号精确
	if u.Mobile != "" {
		if user, err := s.userRepo.GetByPhone(ctx, u.Mobile); err == nil {
			if user.IDSource != "" && user.IDSource != platform && user.ExternalID != "" {
				return nil, fmt.Errorf("该手机号已绑定其他平台账号(%s)", user.IDSource)
			}
			user.ExternalID = u.ExternalID
			user.IDSource = platform
			if user.Nickname == "" && u.Name != "" {
				user.Nickname = u.Name
			}
			if user.Remark == "" {
				user.Remark = fmt.Sprintf("来自%s扫码登录(手机号匹配绑定)", platformLabel(platform))
			}
			if err := s.userRepo.SyncUpdate(ctx, user); err != nil {
				return nil, fmt.Errorf("绑定用户失败: %w", err)
			}
			return user, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("查询用户失败: %w", err)
		}
	}
	// 3. 自动创建
	hashed, err := xcryption.HashPassword(randomPassword())
	if err != nil {
		return nil, errors.New("初始密码加密失败")
	}
	taken, err := s.userRepo.GetUsernamesByList(ctx, []string{})
	if err != nil {
		return nil, err
	}
	username := PickUsername(platform, u.ExternalID, u.Mobile, taken)
	user := &model.SysUser{
		Username:   username,
		Password:   hashed,
		Nickname:   u.Name,
		Phone:      u.Mobile,
		Status:     1,
		ExternalID: u.ExternalID,
		IDSource:   platform,
		Remark:     fmt.Sprintf("来自%s扫码登录自动创建", platformLabel(platform)),
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}
	return user, nil
}

// ── 工具 ──

// providerOf 平台标识 → sys_oauth_config.provider(两者同字面量:dingtalk/feishu)。
func providerOf(platform string) string { return platform }

// platformLabel 平台中文名(日志/错误文案)。
func platformLabel(platform string) string {
	if platform == model.IDSourceDingtalk {
		return "钉钉"
	}
	if platform == model.IDSourceFeishu {
		return "飞书"
	}
	return platform
}

// redirectOrigin 校验并提取回调配置的 origin(scheme://host)。
func redirectOrigin(redirectURI string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(redirectURI))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", fmt.Errorf("回调地址配置无效(redirect_uri=%q),请检查「第三方应用」配置", redirectURI)
	}
	return u.Scheme + "://" + u.Host, nil
}
