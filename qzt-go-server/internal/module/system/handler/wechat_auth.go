package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// WechatAuthHandler 微信服务号免登录/绑定。
type WechatAuthHandler struct {
	svc *service.WechatAuthService
}

func NewWechatAuthHandler() *WechatAuthHandler {
	return &WechatAuthHandler{svc: service.NewWechatAuthService()}
}

// LoginURL 获取微信网页授权登录 URL(公开)
// @Summary      微信免登录授权URL
// @Description  返回微信网页授权 URL(scope=snsapi_base 静默授权)。移动端在微信浏览器内加载后 JS 跳转。需先在「第三方登录配置」启用微信服务号。
// @Tags         认证
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wechat/login-url [get]
func (h *WechatAuthHandler) LoginURL(c *gin.Context) {
	url, err := h.svc.GetLoginURL(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"url": url})
}

// Login 微信免登录回调
// @Summary      微信免登录
// @Description  用微信 OAuth code 换取 openid 并登录(仅已绑定服务号的账号)。返回结构与账密登录一致。
// @Tags         认证
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "回调参数"  example({"code":"AUTH_CODE"})
// @Success      200  {object}  xresponse.Response{data=service.LoginResponse}
// @Router       /system/auth/wechat/login [post]
func (h *WechatAuthHandler) Login(c *gin.Context) {
	var body struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	resp, err := h.svc.LoginByCode(c.Request.Context(), body.Code)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	middleware.RecordLogin(c, "微信免登录", resp.UserID, resp.Username, true, "")
	if resp.UserID == service.RootAccountID {
		service.AlertRootAccountLogin(c.Request.Context(), c.ClientIP())
	}
	response.OK(c, resp)
}

// BindURL 获取绑定授权 URL
// @Summary      微信服务号绑定授权URL
// @Description  当前用户发起微信绑定时获取授权 URL(微信浏览器内跳转)。state 已存 Redis 关联用户。
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wechat/bind-url [get]
func (h *WechatAuthHandler) BindURL(c *gin.Context) {
	userID := middleware.GetUserID(c)
	url, state, err := h.svc.GetBindURL(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"url": url, "state": state})
}

// Bind 绑定微信服务号
// @Summary      绑定微信服务号
// @Description  用微信 OAuth code 绑定到当前用户(state 校验归属,一次性)。该微信已绑定其他账号则拒绝。
// @Tags         认证
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "绑定请求"  example({"code":"AUTH_CODE","state":"wxb_xxx"})
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wechat/bind [post]
func (h *WechatAuthHandler) Bind(c *gin.Context) {
	var body struct {
		Code  string `json:"code" binding:"required"`
		State string `json:"state" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.BindWechat(c.Request.Context(), userID, body.Code, body.State); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Unbind 解绑微信服务号
// @Summary      解绑微信服务号
// @Description  清空当前用户的微信服务号绑定
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wechat/bind [delete]
func (h *WechatAuthHandler) Unbind(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if err := h.svc.UnbindWechat(c.Request.Context(), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// BindStatus 查询绑定状态
// @Summary      微信服务号绑定状态
// @Description  返回当前用户是否已绑定微信服务号
// @Tags         认证
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/auth/wechat/bind-status [get]
func (h *WechatAuthHandler) BindStatus(c *gin.Context) {
	userID := middleware.GetUserID(c)
	bound, openid := h.svc.GetBindStatus(c.Request.Context(), userID)
	response.OK(c, gin.H{"bound": bound, "openid": openid})
}
