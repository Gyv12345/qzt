package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"gorm.io/gorm"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/wxmp"
	"qzt-go-server/internal/repository"
)

// wechat_auth.go 微信服务号免登录 + 绑定服务。
// 流程:微信浏览器内 OAuth(snsapi_base 静默授权) → code → openid → 查已绑定用户 → 签发 JWT。
// 与企微登录同源:配置存 sys_oauth_config(provider=wechat_mp),不自动建号,仅已绑定账号可登录。
// 绑定流程必须带登录态(移动端「我的-微信通知」页发起),state 经 Redis 关联用户。

// WechatAuthService 微信服务号认证服务。
type WechatAuthService struct {
	userRepo  *repository.UserRepo
	oauthRepo *repository.OauthConfigRepo
}

func NewWechatAuthService() *WechatAuthService {
	return &WechatAuthService{
		userRepo:  repository.NewUserRepo(),
		oauthRepo: repository.NewOauthConfigRepo(),
	}
}

// wechatMPExtra Extra JSON 的扩展字段。
type wechatMPExtra struct {
	TemplateID string `json:"template_id"`
}

// newWxmpClient 从 sys_oauth_config 读取服务号配置,构造客户端。
// Extra JSON 携带 template_id(模板消息通知用,可为空)。
func (s *WechatAuthService) newWxmpClient(ctx context.Context) (*wxmp.Client, error) {
	cfg, err := s.oauthRepo.GetEnabledByProvider(ctx, model.OAuthProviderWechatMP)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("微信服务号未启用,请在「第三方登录配置」中启用")
		}
		return nil, fmt.Errorf("读取微信服务号配置失败: %w", err)
	}
	var extra wechatMPExtra
	_ = json.Unmarshal([]byte(cfg.Extra), &extra)
	client := wxmp.NewClient(wxmp.Config{
		AppID:       cfg.AppID,
		Secret:      cfg.AppSecret,
		RedirectURI: cfg.RedirectURI,
		TemplateID:  extra.TemplateID,
	})
	if !client.IsConfigured() {
		return nil, errors.New("微信服务号配置不完整(AppID/Secret 未填写)")
	}
	return client, nil
}

// ── 微信内免登录 ──

// GetLoginURL 获取微信网页授权登录 URL(移动端在微信浏览器内跳转)。
func (s *WechatAuthService) GetLoginURL(ctx context.Context) (string, error) {
	client, err := s.newWxmpClient(ctx)
	if err != nil {
		return "", err
	}
	state := "wxlogin_" + randomHex(8)
	return client.BuildAuthorizeURL(state, client.RedirectURI()), nil
}

// LoginByCode 用微信 OAuth code 登录(查已绑定用户 + 签发 JWT)。
// 仅允许已绑定服务号的账号登录(未绑定返回错误,不自动建号)。
func (s *WechatAuthService) LoginByCode(ctx context.Context, code string) (*LoginResponse, error) {
	client, err := s.newWxmpClient(ctx)
	if err != nil {
		return nil, err
	}

	openid, err := client.Code2OpenID(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("微信授权失败: %w", err)
	}

	user, err := s.userRepo.GetByWechatOpenID(ctx, openid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("该微信尚未绑定系统账号,请先用账号密码登录,在「我的-微信通知」中绑定")
		}
		return nil, fmt.Errorf("查询用户失败: %w", err)
	}
	if user.Status != 1 {
		return nil, errors.New("用户已被禁用")
	}

	tokens, err := app.JwtManager.GenerateTokens(int32(user.ID), user.Username, user.TokenVersion)
	if err != nil {
		return nil, errors.New("生成 Token 失败")
	}
	return &LoginResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		AccessExpire: tokens.AccessExpire.Unix(),
		UserID:       user.ID,
		Username:     user.Username,
		Nickname:     user.Nickname,
	}, nil
}

// ── 绑定/解绑(已登录用户操作) ──

const wechatBindStateTTL = 5 * time.Minute

func wechatBindKey(state string) string { return "qzt:wxmp:bind:" + state }

// GetBindURL 获取绑定授权 URL(移动端微信通知页跳转)。
// state 存 Redis 关联当前用户,回调时校验。
func (s *WechatAuthService) GetBindURL(ctx context.Context, userID uint) (string, string, error) {
	client, err := s.newWxmpClient(ctx)
	if err != nil {
		return "", "", err
	}
	state := "wxb_" + randomHex(8)
	app.Redis.Set(ctx, wechatBindKey(state), strconv.FormatUint(uint64(userID), 10), wechatBindStateTTL)
	return client.BuildAuthorizeURL(state, client.RedirectURI()), state, nil
}

// BindWechat 用微信 code 绑定到当前用户(state 校验归属,一次性)。
// 该 openid 已绑定其他账号则拒绝。
func (s *WechatAuthService) BindWechat(ctx context.Context, userID uint, code, state string) error {
	// state → userID 校验(一次性取出)
	val, err := app.Redis.GetDel(ctx, wechatBindKey(state)).Result()
	if err != nil || val == "" {
		return errors.New("绑定状态已过期,请重新发起绑定")
	}
	stateUserID, err := strconv.ParseUint(val, 10, 64)
	if err != nil || uint(stateUserID) != userID {
		return errors.New("绑定状态无效")
	}

	client, err := s.newWxmpClient(ctx)
	if err != nil {
		return err
	}
	openid, err := client.Code2OpenID(ctx, code)
	if err != nil {
		return fmt.Errorf("微信授权失败: %w", err)
	}

	// 该 openid 是否已绑定其他用户
	existing, err := s.userRepo.GetByWechatOpenID(ctx, openid)
	if err == nil && existing != nil && existing.ID != userID {
		return errors.New("该微信已绑定其他用户")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("用户不存在")
	}
	user.WechatOpenID = openid
	return s.userRepo.Update(ctx, user)
}

// UnbindWechat 解绑微信服务号(清空 wechat_openid)。
func (s *WechatAuthService) UnbindWechat(ctx context.Context, userID uint) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("用户不存在")
	}
	if user.WechatOpenID == "" {
		return errors.New("当前用户未绑定微信")
	}
	user.WechatOpenID = ""
	return s.userRepo.Update(ctx, user)
}

// GetBindStatus 返回用户的服务号绑定状态。
func (s *WechatAuthService) GetBindStatus(ctx context.Context, userID uint) (bool, string) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return false, ""
	}
	return user.WechatOpenID != "", user.WechatOpenID
}
