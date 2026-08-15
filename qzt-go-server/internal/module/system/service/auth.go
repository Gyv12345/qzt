package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xcryption"
	"qzt-go-server/pkg/xlogger"
)

// AuthService 认证服务：登录 / 登出 / 刷新令牌。
type AuthService struct {
	userRepo *repository.UserRepo
}

func NewAuthService() *AuthService {
	return &AuthService{userRepo: repository.NewUserRepo()}
}

// LoginRequest 登录请求。
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录成功响应，返回 access/refresh 令牌对与基础用户信息。
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	AccessExpire int64  `json:"access_expire"` // unix 秒
	UserID       uint   `json:"user_id"`
	Username     string `json:"username"`
	Nickname     string `json:"nickname"`
}

// Login 校验用户名密码并签发令牌。失败按 (username, ip) 维度计数限流。
func (s *AuthService) Login(ctx context.Context, req *LoginRequest, ip string) (*LoginResponse, error) {
	if cache.IsLoginLocked(req.Username, ip) {
		ttl := cache.GetLoginLockTTL(req.Username, ip)
		minutes := int(ttl.Minutes()) + 1
		return nil, fmt.Errorf("登录失败次数过多，请 %d 分钟后重试", minutes)
	}

	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		cache.IncrLoginFail(req.Username, ip)
		return nil, errors.New("用户名或密码错误")
	}

	if user.Status != 1 {
		// 与"用户不存在/密码错误"统一措辞,不确认账号存在与否(防用户名枚举);
		// 真实原因记日志,管理员侧可查。
		xlogger.ErrorfCtx(ctx, "登录拒绝: 用户 %s 已被禁用", req.Username)
		return nil, errors.New("登录失败: 用户名、密码错误或账号已被禁用")
	}

	if !xcryption.CheckPassword(user.Password, req.Password) {
		count, _ := cache.IncrLoginFail(req.Username, ip)
		remaining := int64(loginFailMax) - count
		if remaining > 0 {
			return nil, fmt.Errorf("用户名或密码错误，还可尝试 %d 次", remaining)
		}
		return nil, errors.New("登录失败次数过多，账户已被临时锁定")
	}

	cache.ClearLoginFail(req.Username, ip)

	// 签发 access + refresh 令牌对，携带当前 token_version 用于会话撤销
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

// Logout 将 token 加入 Redis 黑名单（按剩余有效期过期），实现登出即时失效。
func (s *AuthService) Logout(ctx context.Context, token string) error {
	claims, err := app.JwtManager.ParseToken(token)
	if err != nil {
		return nil // 无效/已过期的 token 无需拉黑
	}
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl <= 0 {
		return nil
	}
	return cache.BlacklistToken(token, ttl)
}

// RefreshRequest 刷新令牌请求。
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Refresh 用 refresh token 换取新的令牌对。若用户 token_version 已变更则拒绝。
func (s *AuthService) Refresh(ctx context.Context, req *RefreshRequest) (*LoginResponse, error) {
	claims, err := app.JwtManager.ParseToken(req.RefreshToken)
	if err != nil {
		return nil, errors.New("refresh token 无效或已过期")
	}
	if !claims.IsRefreshToken() {
		return nil, errors.New("refresh token 无效或已过期")
	}
	// 校验 token_version 仍有效（改密/禁用后旧 refresh 也不可用）
	version, err := s.userRepo.GetTokenVersion(ctx, uint(claims.UserId))
	if err != nil || version != claims.TokenVersion {
		return nil, errors.New("登录状态已失效，请重新登录")
	}
	tokens, err := app.JwtManager.RefreshTokens(req.RefreshToken)
	if err != nil {
		return nil, errors.New("刷新令牌失败")
	}
	// 轮换失效:新令牌对签发后立即拉黑旧 refresh token(按其剩余存活期),
	// 泄露的旧 refresh 无法在剩余有效期内继续换新,而不是自然用到过期。
	if exp := claims.ExpiresAt; exp != nil {
		if ttl := time.Until(exp.Time); ttl > 0 {
			_ = cache.BlacklistToken(req.RefreshToken, ttl)
		}
	}
	user, err := s.userRepo.GetByID(ctx, uint(claims.UserId))
	if err != nil {
		return nil, errors.New("用户不存在")
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

// loginFailMax 与 cache.loginLimitMax 对齐（5 次）。
const loginFailMax = 5

// ── 个人资料修改 ──

// UpdateProfileRequest 修改个人信息请求(仅允许昵称/头像/邮箱/手机)。
type UpdateProfileRequest struct {
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
}

// UpdateProfile 当前用户修改自己的个人资料(不允许改 username/密码/角色/状态)。
func (s *AuthService) UpdateProfile(ctx context.Context, userID uint, req *UpdateProfileRequest) (*model.SysUser, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, errors.New("用户不存在")
	}
	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// ── 修改密码 ──

// ChangePasswordRequest 修改密码请求。
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

// ChangePassword 当前用户修改密码。校验旧密码,TokenVersion+1 使旧会话失效。
func (s *AuthService) ChangePassword(ctx context.Context, userID uint, req *ChangePasswordRequest) error {
	if len(req.NewPassword) < 6 || len(req.NewPassword) > 72 {
		return errors.New("新密码长度需在 6-72 之间")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("用户不存在")
	}
	if !xcryption.CheckPassword(user.Password, req.OldPassword) {
		return errors.New("旧密码错误")
	}

	hashed, err := xcryption.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}
	user.Password = hashed
	user.TokenVersion++ // 使所有旧 token 失效(前端需重新登录)
	return s.userRepo.Update(ctx, user)
}
