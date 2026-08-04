package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/wecom"
	"qzt-go-server/pkg/xcryption"
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

// LoginByCode 用企业微信 OAuth code 登录(查/建用户 + 签发 JWT)。
// 返回的 LoginResponse 与账密登录完全一致,前端无感知差异。
func (s *WecomAuthService) LoginByCode(ctx context.Context, code string) (*LoginResponse, error) {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return nil, err
	}

	// 1. code → 企业微信 userid
	wecomUserID, err := client.GetUserIDByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("企业微信授权失败: %w", err)
	}

	// 2. 按 wecomUserID 查本地用户
	user, err := s.userRepo.GetByWecomUserID(ctx, wecomUserID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("查询用户失败: %w", err)
		}
		// 3. 未找到 → 自动创建
		user, err = s.createWecomUser(ctx, client, wecomUserID)
		if err != nil {
			return nil, err
		}
	}

	// 4. 校验状态
	if user.Status != 1 {
		return nil, errors.New("用户已被禁用")
	}

	// 5. 签发 JWT(复用账密登录的令牌体系)
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

// createWecomUser 自动创建企业微信扫码用户。
// username = wecom_<userid>,随机密码(不可用于账密登录),尝试拉取姓名/头像。
func (s *WecomAuthService) createWecomUser(ctx context.Context, client *wecom.Client, wecomUserID string) (*model.SysUser, error) {
	username := "wecom_" + wecomUserID
	nickname := wecomUserID // 默认用 userid 作昵称
	avatar := ""

	// 尝试获取企业微信成员信息(失败不阻断创建)
	if member, err := client.GetMember(ctx, wecomUserID); err == nil && member != nil {
		if member.Name != "" {
			nickname = member.Name
		}
		avatar = member.Avatar
	}

	// 生成随机密码(64 字符 hex,用户不知道,无法用于账密登录)
	randomPwd := randomHex(32)
	hashed, err := xcryption.HashPassword(randomPwd)
	if err != nil {
		return nil, fmt.Errorf("哈希密码失败: %w", err)
	}

	user := &model.SysUser{
		Username:    username,
		Password:    hashed,
		Nickname:    nickname,
		Avatar:      avatar,
		Status:      1,
		WecomUserID: wecomUserID,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}
	return user, nil
}

// randomHex 生成 n 字节的随机 hex 字符串(共 2n 字符)。
func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// ── 企业微信绑定/解绑(已登录用户操作) ──

// GetBindQrcodeURL 获取企微绑定扫码 URL(与登录扫码相同 URL,state 里带 bind_ 前缀区分)。
func (s *WecomAuthService) GetBindQrcodeURL(ctx context.Context, userID uint) (string, string, error) {
	client, err := s.newWecomClient(ctx)
	if err != nil {
		return "", "", err
	}
	// state 带 bind_ 前缀 + userID,回调时识别为绑定操作
	state := fmt.Sprintf("bind_%d_%s", userID, randomHex(8))
	return client.BuildAuthorizeURL(state), state, nil
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
