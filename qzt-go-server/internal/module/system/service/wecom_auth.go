package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/wecom"
)

// wecom_auth.go 企业微信扫码登录服务。
// 流程:code → 企业微信 userid → 查/建本地用户 → 签发 JWT(复用账密登录的令牌体系)。
// 配置从 sys_oauth_config 表读取(独立管理页面),不从 sys_config 读。

// WecomAuthService 企业微信扫码登录服务。
type WecomAuthService struct {
	userRepo  *repository.UserRepo
	oauthRepo *repository.OauthConfigRepo
}

func NewWecomAuthService() *WecomAuthService {
	return &WecomAuthService{
		userRepo:  repository.NewUserRepo(),
		oauthRepo: repository.NewOauthConfigRepo(),
	}
}

// newWecomClient 从 sys_oauth_config 读取企业微信配置,构造客户端。
func (s *WecomAuthService) newWecomClient(ctx context.Context) (*wecom.Client, error) {
	cfg, err := s.oauthRepo.GetEnabledByProvider(ctx, model.OAuthProviderWecom)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("企业微信登录未启用,请在「第三方登录配置」中启用")
		}
		return nil, fmt.Errorf("读取企业微信配置失败: %w", err)
	}
	client := wecom.NewClient(wecom.Config{
		CorpID:      cfg.AppID,
		AgentID:     cfg.AgentID,
		Secret:      cfg.AppSecret,
		RedirectURI: cfg.RedirectURI,
	})
	if !client.IsConfigured() {
		return nil, errors.New("企业微信配置不完整(AppID/Secret 未填写)")
	}
	return client, nil
}

// GetQrcodeURL 获取企业微信扫码授权 URL(前端跳转用)。
func (s *WecomAuthService) GetQrcodeURL(ctx context.Context, state string) (string, error) {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return "", err
	}
	return client.BuildAuthorizeURL(state), nil
}

const (
	// loginStatePrefix 标识桌面端扫码轮询模式的 state 前缀。
	loginStatePrefix = "login_"
	// loginTicketTTL 扫码登录票据有效期(略长于前端轮询上限 5min)。
	loginTicketTTL = 5 * time.Minute
)

// loginTicketKey 拼接桌面扫码登录票据的 Redis key。
func loginTicketKey(state string) string { return "qzt:wecom:login:" + state }

// loginRedirectURI 从配置的 redirect_uri 提取 origin,拼接登录专用回调路径 /auth/wecom/login。
// 登录与绑定使用各自回调页,且自动跟随环境(生产 m.devlovecode.com)。
func loginRedirectURI(cfgRedirectURI string) (string, error) {
	u, err := url.Parse(cfgRedirectURI)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", fmt.Errorf("企业微信 redirect_uri 配置无效: %s", cfgRedirectURI)
	}
	return u.Scheme + "://" + u.Host + "/auth/wecom/login", nil
}

// LoginByCode 用企业微信 OAuth code 登录(查已绑定用户 + 签发 JWT)。
// 返回的 LoginResponse 与账密登录完全一致,前端无感知差异。
// 仅允许已绑定企业微信的账号扫码登录(未绑定返回错误,不自动建号)。
// state 以 loginStatePrefix 开头表示桌面端扫码轮询模式:签发后把 token 存 Redis 供 PC 轮询,
// 返回 isScanPoll=true 通知 handler 不直接回传 token(改为提示用户回电脑端)。
func (s *WecomAuthService) LoginByCode(ctx context.Context, code, state string) (*LoginResponse, bool, error) {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return nil, false, err
	}

	// 1. code → 企业微信 userid
	wecomUserID, err := client.GetUserIDByCode(ctx, code)
	if err != nil {
		return nil, false, fmt.Errorf("企业微信授权失败: %w", err)
	}

	// 2. 按 wecomUserID 查本地用户(仅已绑定账号可登录,不自动建号)
	user, err := s.userRepo.GetByWecomUserID(ctx, wecomUserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, false, errors.New("该企业微信账号尚未绑定系统用户,请先用账号密码登录后在「我的-企业微信」绑定")
		}
		return nil, false, fmt.Errorf("查询用户失败: %w", err)
	}

	// 3. 校验状态
	if user.Status != 1 {
		return nil, false, errors.New("用户已被禁用")
	}

	// 4. 签发 JWT(复用账密登录的令牌体系)
	tokens, err := app.JwtManager.GenerateTokens(int32(user.ID), user.Username, user.TokenVersion)
	if err != nil {
		return nil, false, errors.New("生成 Token 失败")
	}

	resp := &LoginResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		AccessExpire: tokens.AccessExpire.Unix(),
		UserID:       user.ID,
		Username:     user.Username,
		Nickname:     user.Nickname,
	}

	// 5. 桌面端扫码轮询模式:把登录结果存 Redis,供 PC 端轮询取回(一次性)
	if isScanPoll := strings.HasPrefix(state, loginStatePrefix); isScanPoll {
		data, err := json.Marshal(resp)
		if err != nil {
			return nil, false, fmt.Errorf("序列化登录结果失败: %w", err)
		}
		app.Redis.Set(ctx, loginTicketKey(state), string(data), loginTicketTTL)
		return resp, true, nil
	}
	return resp, false, nil
}

// GetLoginQrcodeURL 获取扫码登录授权 URL(前端跳转/出码用)。
// mode: "scan" 桌面端轮询(生成 login_ 票据存 Redis 占位 pending) / "app" 手机企微内同步(无票据)。
func (s *WecomAuthService) GetLoginQrcodeURL(ctx context.Context, mode string) (string, string, error) {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return "", "", err
	}

	var state string
	if mode == "scan" {
		state = loginStatePrefix + randomHex(16)
		app.Redis.Set(ctx, loginTicketKey(state), "pending", loginTicketTTL)
	} else {
		state = randomHex(16)
	}

	redirectURI, err := loginRedirectURI(client.RedirectURI())
	if err != nil {
		return "", "", err
	}
	return client.BuildAuthorizeURLWithRedirect(state, redirectURI), state, nil
}

// PollLoginStatus 桌面端轮询扫码登录状态。
// 返回 status: "waiting"(待完成) / "success"(完成,附带 token) / "error"(登录失败,附带原因) / "expired"(票据过期或不存在)。
func (s *WecomAuthService) PollLoginStatus(ctx context.Context, state string) (status string, resp *LoginResponse, errMsg string) {
	val, err := app.Redis.Get(ctx, loginTicketKey(state)).Result()
	if err != nil || val == "" {
		return "expired", nil, ""
	}
	if val == "pending" {
		return "waiting", nil, ""
	}
	// 登录结果或错误:取出并删除(一次性,防重放)
	app.Redis.Del(ctx, loginTicketKey(state))
	// 先判错误票据 {"error":"..."}
	var em struct {
		Error string `json:"error"`
	}
	if json.Unmarshal([]byte(val), &em) == nil && em.Error != "" {
		return "error", nil, em.Error
	}
	var lr LoginResponse
	if err := json.Unmarshal([]byte(val), &lr); err != nil {
		return "expired", nil, ""
	}
	return "success", &lr, ""
}

// StoreLoginError 桌面扫码登录失败时,把错误原因存入票据,供 PC 轮询即时获知失败原因(如未绑定)。
// 仅对 login_ 前缀的 state(桌面轮询模式)生效;同步模式直接由调用方返回错误。
func (s *WecomAuthService) StoreLoginError(ctx context.Context, state, msg string) {
	if !strings.HasPrefix(state, loginStatePrefix) {
		return
	}
	data, _ := json.Marshal(map[string]string{"error": msg})
	app.Redis.Set(ctx, loginTicketKey(state), string(data), loginTicketTTL)
}

// randomHex 生成 n 字节的随机 hex 字符串(共 2n 字符)。
func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// ── 企业微信绑定/解绑(已登录用户操作) ──

// GetBindQrcodeURL 获取企微绑定扫码 URL(含 OAuth URL)。
func (s *WecomAuthService) GetBindQrcodeURL(ctx context.Context, userID uint) (string, string, error) {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return "", "", err
	}
	state := fmt.Sprintf("bind_%d_%s", userID, randomHex(8))
	app.Redis.Set(ctx, "qzt:wecom:bind:"+state, strconv.FormatUint(uint64(userID), 10), 5*time.Minute)
	return client.BuildAuthorizeURL(state), state, nil
}

// CreateBindState 生成绑定 state 并存入 Redis(不构造 OAuth URL,由前端页面触发)。
func (s *WecomAuthService) CreateBindState(ctx context.Context, userID uint) (string, error) {
	state := fmt.Sprintf("bind_%d_%s", userID, randomHex(8))
	app.Redis.Set(ctx, "qzt:wecom:bind:"+state, strconv.FormatUint(uint64(userID), 10), 5*time.Minute)
	return state, nil
}

// BindWecom 用企微 code 绑定到当前用户。若该 wecomUserID 已绑定其他账号则拒绝。
func (s *WecomAuthService) BindWecom(ctx context.Context, userID uint, code string) error {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return err
	}

	// code → 企业微信 userid
	wecomUserID, err := client.GetUserIDByCode(ctx, code)
	if err != nil {
		return fmt.Errorf("企业微信授权失败: %w", err)
	}

	// 检查该 wecomUserID 是否已被其他用户绑定
	existing, err := s.userRepo.GetByWecomUserID(ctx, wecomUserID)
	if err == nil && existing != nil && existing.ID != userID {
		return errors.New("该企业微信账号已绑定其他用户")
	}

	// 写入当前用户的 wecom_user_id
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("用户不存在")
	}
	user.WecomUserID = wecomUserID
	return s.userRepo.Update(ctx, user)
}

// BindByState 公开绑定接口(无需 JWT): 用 state 从 Redis 反查 userID,再走绑定流程。
// 用于跨设备扫码绑定——手机扫码后回调页面没有桌面端的 JWT,靠 state 关联用户。
func (s *WecomAuthService) BindByState(ctx context.Context, code, state string) error {
	// 从 Redis 原子取出并删除 state→userID(一次性)
	val, err := app.Redis.GetDel(ctx, "qzt:wecom:bind:"+state).Result()
	if err != nil || val == "" {
		return errors.New("绑定状态已过期,请重新生成二维码")
	}
	userID, err := strconv.ParseUint(val, 10, 64)
	if err != nil {
		return errors.New("绑定状态无效")
	}
	return s.BindWecom(ctx, uint(userID), code)
}

// UnbindWecom 解绑企业微信(清空 wecom_user_id)。
func (s *WecomAuthService) UnbindWecom(ctx context.Context, userID uint) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("用户不存在")
	}
	if user.WecomUserID == "" {
		return errors.New("当前用户未绑定企业微信")
	}
	user.WecomUserID = ""
	return s.userRepo.Update(ctx, user)
}

// GetBindStatus 返回用户的企微绑定状态(桌面端轮询用)。
func (s *WecomAuthService) GetBindStatus(ctx context.Context, userID uint) (bool, string) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return false, ""
	}
	return user.WecomUserID != "", user.WecomUserID
}
