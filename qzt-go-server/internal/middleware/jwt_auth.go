package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xauth"
	jwtpkg "qzt-go-server/pkg/xauth/jwt"
	"qzt-go-server/pkg/xresponse"
)

// gin context 中存储登录身份的键。Casbin 中间件与 handler 通过这些键取值。
const (
	CtxUserIDKey    = "user_id"
	CtxUsernameKey  = "username"
	CtxRoleCodesKey = "role_codes"
)

// JWTAuth 校验 Bearer access token，并做两层失效校验：
//  1. Redis 黑名单（登出时写入）；
//  2. token_version 与用户当前版本比对（改密/禁用/改角色后旧 token 立即失效）。
//
// 校验通过后将 user_id / username / role_codes 写入 gin context 与 request context，
// 供后续 Casbin 与业务代码取用。
func JWTAuth(mgr *jwtpkg.Manager) gin.HandlerFunc {
	userRepo := repository.NewUserRepo()
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			failUnauthorized(c, "缺少认证信息")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			failUnauthorized(c, "认证格式错误")
			return
		}

		tokenString := parts[1]
		if cache.IsTokenBlacklisted(tokenString) {
			failUnauthorized(c, "Token 已失效，请重新登录")
			return
		}

		claims, err := mgr.ParseToken(tokenString)
		if err != nil {
			failUnauthorized(c, "Token 无效或已过期")
			return
		}
		if err := claims.ValidAccessToken(); err != nil {
			failUnauthorized(c, "Token 类型错误")
			return
		}

		// 会话撤销：比对 token 版本与用户当前版本
		user, err := userRepo.GetByID(c.Request.Context(), uint(claims.UserId))
		if err != nil || user.TokenVersion != claims.TokenVersion {
			failUnauthorized(c, "登录状态已失效，请重新登录")
			return
		}
		if user.Status != 1 {
			xresponse.Forbidden(c, "账号已被禁用")
			return
		}

		roleCodes := make([]string, 0, len(user.Roles))
		for _, r := range user.Roles {
			roleCodes = append(roleCodes, r.Code)
		}

		// gin context（供 handler / 其他中间件读取）
		c.Set(CtxUserIDKey, uint(claims.UserId))
		c.Set(CtxUsernameKey, claims.Username)
		c.Set(CtxRoleCodesKey, roleCodes)
		// request context（供 service 通过 xauth.GetUserContext 读取）
		ctx := context.WithValue(c.Request.Context(), xauth.XUserId, claims.UserId)
		ctx = context.WithValue(ctx, xauth.XUserName, claims.Username)
		ctx = context.WithValue(ctx, xauth.XSessionId, claims.SessionId)
		c.Request = c.Request.WithContext(ctx)
		InjectDataScope(c, user)

		c.Next()
	}
}

// GetUserID 从 gin context 取当前登录用户 ID。
func GetUserID(c *gin.Context) uint {
	val, exists := c.Get(CtxUserIDKey)
	if !exists {
		return 0
	}
	id, _ := val.(uint)
	return id
}

// InjectDataScope 将数据权限范围、部门ID、用户ID 注入 request context,
// 供 service 层通过 datascope.GetScope / datascope.BuildCond 读取。
// 超管或多角色取最宽松 scope(ALL 最宽松)。
func InjectDataScope(c *gin.Context, user *model.SysUser) {
	// 计算有效数据权限(多角色取最宽松)
	scope := datascope.EffectiveScope(user.Roles)
	var deptID uint
	if user.DeptID != nil {
		deptID = *user.DeptID
	}
	userID, _ := c.Get(CtxUserIDKey)
	uid, _ := userID.(uint)

	// gin context(供 handler 读)
	c.Set(datascope.CtxDeptIDKey, deptID)
	c.Set(datascope.CtxDataScopeKey, scope)
	// request context(供 service 读)
	ctx := context.WithValue(c.Request.Context(), datascope.CtxDeptIDKey, deptID)
	ctx = context.WithValue(ctx, datascope.CtxDataScopeKey, scope)
	ctx = context.WithValue(ctx, datascope.CtxUserIDKey, uid)
	c.Request = c.Request.WithContext(ctx)
}

// GetUsername 从 gin context 取当前登录用户名。
func GetUsername(c *gin.Context) string {
	val, exists := c.Get(CtxUsernameKey)
	if !exists {
		return ""
	}
	name, _ := val.(string)
	return name
}

// GetRoleCodes 从 gin context 取当前登录用户的角色编码列表。
func GetRoleCodes(c *gin.Context) []string {
	val, exists := c.Get(CtxRoleCodesKey)
	if !exists {
		return nil
	}
	codes, _ := val.([]string)
	return codes
}

// failUnauthorized 返回 401 并终止后续中间件/handler。
// 鉴权类中间件必须用 abort 变体，否则请求会继续穿透到后续链路。
func failUnauthorized(c *gin.Context, msg string) {
	xresponse.Unauthorized(c, msg)
}

// ── Auth 双源认证(JWT + API Key) ──
//
// Auth 是 JWTAuth 的超集:先检查是否为 API Key(qzt_ 前缀),
// 是则走 API Key 认证;否则回退到 JWT 认证。
// 两种方式都写入相同的 context key,Casbin/handler/service 零改动。
//
// 用法:用 Auth(app.JwtManager) 替换原来的 JWTAuth(app.JwtManager)。
func Auth(mgr *jwtpkg.Manager) gin.HandlerFunc {
	userRepo := repository.NewUserRepo()
	apiKeyRepo := repository.NewApiKeyRepo()

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			failUnauthorized(c, "缺少认证信息")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			failUnauthorized(c, "认证格式错误")
			return
		}

		tokenString := parts[1]

		// API Key 路径(qzt_ 前缀)
		if apiKey, ok := tryApiKeyAuth(c, apiKeyRepo, userRepo, tokenString); ok {
			c.Set("_auth_method", "api_key")
			c.Set("_api_key_id", apiKey.ID)
			c.Next()
			return
		}

		// JWT 路径
		tryJwtAuth(c, userRepo, mgr, tokenString)
	}
}

// tryApiKeyAuth 尝试 API Key 认证。成功返回 (key, true),失败返回 (nil, false)。
func tryApiKeyAuth(c *gin.Context, apiKeyRepo *repository.ApiKeyRepo, userRepo *repository.UserRepo, tokenString string) (*model.SysApiKey, bool) {
	// 快速判断:不是 qzt_ 前缀就不是 API Key
	if !strings.HasPrefix(tokenString, model.ApiKeyPrefix) {
		return nil, false
	}

	keyHash := repository.HashKey(tokenString)
	apiKey, err := apiKeyRepo.GetByHash(c.Request.Context(), keyHash)
	if err != nil {
		failUnauthorized(c, "API Key 无效")
		return nil, true // 返回 true 表示"已处理"(即使失败),阻止回退到 JWT
	}

	// 校验过期(NullDateTime 是 time.Time 命名类型,零值表示永不过期)
	if !time.Time(apiKey.ExpiresAt).IsZero() && time.Now().After(time.Time(apiKey.ExpiresAt)) {
		failUnauthorized(c, "API Key 已过期")
		return nil, true
	}

	// 查关联用户
	user, err := userRepo.GetByID(c.Request.Context(), apiKey.UserID)
	if err != nil || user.Status != 1 {
		failUnauthorized(c, "API Key 关联的用户已禁用或不存在")
		return nil, true
	}

	// 异步更新使用记录(不阻塞请求)
	go apiKeyRepo.UpdateLastUsed(context.Background(), apiKey.ID, c.ClientIP())

	// 写入与 JWT 相同的 context key
	roleCodes := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roleCodes = append(roleCodes, r.Code)
	}

	c.Set(CtxUserIDKey, user.ID)
	c.Set(CtxUsernameKey, user.Username)
	c.Set(CtxRoleCodesKey, roleCodes)

	ctx := context.WithValue(c.Request.Context(), xauth.XUserId, int32(user.ID))
	ctx = context.WithValue(ctx, xauth.XUserName, user.Username)
	c.Request = c.Request.WithContext(ctx)
	InjectDataScope(c, user)

	return apiKey, true
}

// tryJwtAuth JWT 认证(从 JWTAuth 提取的逻辑)。
func tryJwtAuth(c *gin.Context, userRepo *repository.UserRepo, mgr *jwtpkg.Manager, tokenString string) {
	if cache.IsTokenBlacklisted(tokenString) {
		failUnauthorized(c, "Token 已失效，请重新登录")
		return
	}

	claims, err := mgr.ParseToken(tokenString)
	if err != nil {
		failUnauthorized(c, "Token 无效或已过期")
		return
	}
	if err := claims.ValidAccessToken(); err != nil {
		failUnauthorized(c, "Token 类型错误")
		return
	}

	user, err := userRepo.GetByID(c.Request.Context(), uint(claims.UserId))
	if err != nil || user.TokenVersion != claims.TokenVersion {
		failUnauthorized(c, "登录状态已失效，请重新登录")
		return
	}
	if user.Status != 1 {
		xresponse.Forbidden(c, "账号已被禁用")
		return
	}

	roleCodes := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roleCodes = append(roleCodes, r.Code)
	}

	c.Set(CtxUserIDKey, uint(claims.UserId))
	c.Set(CtxUsernameKey, claims.Username)
	c.Set(CtxRoleCodesKey, roleCodes)

	ctx := context.WithValue(c.Request.Context(), xauth.XUserId, claims.UserId)
	ctx = context.WithValue(ctx, xauth.XUserName, claims.Username)
	ctx = context.WithValue(ctx, xauth.XSessionId, claims.SessionId)
	c.Request = c.Request.WithContext(ctx)
	InjectDataScope(c, user)

	c.Set("_auth_method", "jwt")
	c.Next()
}
