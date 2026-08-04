package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/pkg/cache"
	response "qzt-go-server/pkg/xresponse"
)

type AuthHandler struct {
	svc      *service.AuthService
	wecomSvc *service.WecomAuthService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		svc:      service.NewAuthService(),
		wecomSvc: service.NewWecomAuthService(),
	}
}

// Login 登录
// @Summary      登录
// @Description  用户名密码登录,返回 access/refresh 双令牌;失败按 (username,ip) 限流
// @Tags         认证
// @Accept       json
// @Produce      json
// @Param        body  body      service.LoginRequest   true  "登录请求"
// @Success      200   {object}  xresponse.Response{data=service.LoginResponse}
// @Failure      200   {object}  xresponse.Response  "code=20003 用户名或密码错误"
// @Router       /system/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}

	res, err := h.svc.Login(c.Request.Context(), &req, c.ClientIP())
	if err != nil {
		// 审计失败登录：用尝试的用户名，userID 记 0
		middleware.RecordLogin(c, "登录", 0, req.Username, false, err.Error())
		response.Fail(c, errcode.ErrPasswordWrong, err.Error())
		return
	}

	middleware.RecordLogin(c, "登录", res.UserID, req.Username, true, "")
	response.OK(c, res)
}

// Refresh 刷新令牌
// @Summary      刷新令牌
// @Description  用 refresh token 换取新的 access/refresh 令牌对
// @Tags         认证
// @Accept       json
// @Produce      json
// @Param        body  body      service.RefreshRequest  true  "刷新请求"
// @Success      200   {object}  xresponse.Response{data=service.LoginResponse}
// @Router       /system/auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req service.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	res, err := h.svc.Refresh(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrTokenInvalid, err.Error())
		return
	}
	response.OK(c, res)
}

// Logout 登出
// @Summary      登出
// @Description  将当前 token 加入黑名单,使其立即失效
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 {
		h.svc.Logout(c.Request.Context(), parts[1])
	}

	userID := middleware.GetUserID(c)
	cache.ClearUserPermissions(userID)

	middleware.RecordLogin(c, "登出", userID, middleware.GetUsername(c), true, "")
	response.OK(c, nil)
}

// GetProfile 当前用户信息
// @Summary      当前用户信息
// @Description  获取登录用户的个人资料(含角色)
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=model.SysUser}
// @Router       /system/auth/profile [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userSvc := service.NewUserService()
	user, err := userSvc.GetProfile(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrUserNotFound, err.Error())
		return
	}
	response.OK(c, user)
}

// UpdateProfile 修改个人信息
// @Summary      修改个人信息
// @Description  修改昵称/头像/邮箱/手机(不允许改用户名/密码/角色/状态)
// @Tags         认证
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.UpdateProfileRequest  true  "修改资料请求"
// @Success      200   {object}  xresponse.Response{data=model.SysUser}
// @Router       /system/auth/profile [put]
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	var req service.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	user, err := h.svc.UpdateProfile(c.Request.Context(), userID, &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, user)
}

// ChangePassword 修改密码
// @Summary      修改密码
// @Description  校验旧密码后更新新密码,同时使所有旧会话失效(需重新登录)
// @Tags         认证
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.ChangePasswordRequest  true  "修改密码请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/auth/password [put]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req service.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.ChangePassword(c.Request.Context(), userID, &req); err != nil {
		response.Fail(c, errcode.ErrPasswordWrong, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 企业微信绑定/解绑 ──

// WecomBindQrcode 获取企微绑定扫码 URL
// @Summary      获取企微绑定扫码URL
// @Description  返回企业微信授权页 URL,扫码后用 code 调 bind 接口完成绑定
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wecom/bind-qrcode [get]
func (h *AuthHandler) WecomBindQrcode(c *gin.Context) {
	userID := middleware.GetUserID(c)
	url, state, err := h.wecomSvc.GetBindQrcodeURL(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"url": url, "state": state})
}

// WecomBind 绑定企业微信
// @Summary      绑定企业微信
// @Description  用企微扫码 code 绑定到当前用户。若该企微ID已绑定其他账号则拒绝。
// @Tags         认证
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "绑定请求"  example({"code":"AUTH_CODE"})
// @Success      200   {object}  xresponse.Response
// @Router       /system/auth/wecom/bind [post]
func (h *AuthHandler) WecomBind(c *gin.Context) {
	var body struct {
		Code  string `json:"code" binding:"required"`
		State string `json:"state"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.wecomSvc.BindWecom(c.Request.Context(), userID, body.Code); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// WecomUnbind 解绑企业微信
// @Summary      解绑企业微信
// @Description  清空当前用户的企业微信绑定
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wecom/bind [delete]
func (h *AuthHandler) WecomUnbind(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if err := h.wecomSvc.UnbindWecom(c.Request.Context(), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetPermissions 当前用户权限
// @Summary      当前用户权限列表
// @Description  获取登录用户的权限标识列表(按钮级权限串)
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]string}
// @Router       /system/auth/permissions [get]
func (h *AuthHandler) GetPermissions(c *gin.Context) {
	userID := middleware.GetUserID(c)

	// Try cache first
	if perms, ok := cache.GetUserPermissions(userID); ok {
		response.OK(c, perms)
		return
	}

	menuSvc := service.NewMenuService()
	perms, err := menuSvc.GetUserPermissions(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}

	cache.SetUserPermissions(userID, perms)
	response.OK(c, perms)
}

// ── 企业微信扫码登录 ──

// WecomQrcode 获取企业微信扫码授权 URL
// @Summary      企业微信扫码授权URL
// @Description  返回企业微信 OAuth2 授权页 URL,前端跳转到此 URL 显示扫码页。需先在系统配置中填写企业微信参数。
// @Tags         认证
// @Produce      json
// @Param        state  query  string  false  "CSRF 防护 state 参数(默认随机生成)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wecom/qrcode [get]
func (h *AuthHandler) WecomQrcode(c *gin.Context) {
	state := c.Query("state")
	if state == "" {
		state = uuid.NewString() // 随机生成 state 防 CSRF
	}
	url, err := h.wecomSvc.GetQrcodeURL(c.Request.Context(), state)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"url": url, "state": state})
}

// WecomCallback 企业微信扫码回调
// @Summary      企业微信扫码登录回调
// @Description  接收企业微信回调的 code,换取用户身份并签发 JWT。首次扫码自动创建用户。
// @Tags         认证
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "回调请求"  example({"code":"AUTH_CODE","state":"xxx"})
// @Success      200   {object}  xresponse.Response{data=service.LoginResponse}
// @Router       /system/auth/wecom/callback [post]
func (h *AuthHandler) WecomCallback(c *gin.Context) {
	var body struct {
		Code  string `json:"code" binding:"required"`
		State string `json:"state"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	resp, err := h.wecomSvc.LoginByCode(c.Request.Context(), body.Code)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	middleware.RecordLogin(c, "企业微信扫码登录", resp.UserID, resp.Username, true, "")
	response.OK(c, resp)
}
