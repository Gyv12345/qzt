package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ImSSOHandler 钉钉/飞书扫码登录(login-only,公开路由,不进 RBAC)。
type ImSSOHandler struct {
	svc *service.ImSSOService
}

func NewImSSOHandler() *ImSSOHandler { return &ImSSOHandler{svc: service.NewImSSOService()} }

// DingtalkQR 钉钉扫码登录跳转
// @Summary      钉钉扫码授权页跳转
// @Description  302 跳转钉钉统一扫码授权页(需先在「第三方应用」启用钉钉并配置回调地址)。
// @Tags         扫码登录
// @Produce      html
// @Success      302  {string}  string
// @Failure      400  {object}  xresponse.Response
// @Router       /enterprise/oauth/dingtalk/qr [get]
func (h *ImSSOHandler) DingtalkQR(c *gin.Context) { h.qr(c, model.IDSourceDingtalk) }

// FeishuQR 飞书扫码登录跳转
// @Summary      飞书扫码授权页跳转
// @Description  302 跳转飞书网页授权页(需先在「第三方应用」启用飞书并配置回调地址)。
// @Tags         扫码登录
// @Produce      html
// @Success      302  {string}  string
// @Failure      400  {object}  xresponse.Response
// @Router       /enterprise/oauth/feishu/qr [get]
func (h *ImSSOHandler) FeishuQR(c *gin.Context) { h.qr(c, model.IDSourceFeishu) }

func (h *ImSSOHandler) qr(c *gin.Context, platform string) {
	target, err := h.svc.GetQRAuthorizeURL(c.Request.Context(), platform)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	c.Redirect(302, target)
}

// DingtalkCallback 钉钉扫码登录回调
// @Summary      钉钉扫码登录回调
// @Description  code 换用户身份→匹配/自动创建→签发 JWT→302 回 admin 回调页(#/oauth/callback?token=..;失败带 error=文案)。state 一次性防 CSRF。
// @Tags         扫码登录
// @Produce      html
// @Param        code   query  string  true  "钉钉授权 code"
// @Param        state  query  string  true  "防 CSRF state"
// @Success      302  {string}  string
// @Failure      400  {object}  xresponse.Response
// @Router       /enterprise/oauth/dingtalk/callback [get]
func (h *ImSSOHandler) DingtalkCallback(c *gin.Context) {
	h.callback(c, model.IDSourceDingtalk, "钉钉扫码登录")
}

// FeishuCallback 飞书扫码登录回调
// @Summary      飞书扫码登录回调
// @Description  code 换用户身份→匹配/自动创建→签发 JWT→302 回 admin 回调页(#/oauth/callback?token=..;失败带 error=文案)。state 一次性防 CSRF。
// @Tags         扫码登录
// @Produce      html
// @Param        code   query  string  true  "飞书授权 code"
// @Param        state  query  string  true  "防 CSRF state"
// @Success      302  {string}  string
// @Failure      400  {object}  xresponse.Response
// @Router       /enterprise/oauth/feishu/callback [get]
func (h *ImSSOHandler) FeishuCallback(c *gin.Context) {
	h.callback(c, model.IDSourceFeishu, "飞书扫码登录")
}

func (h *ImSSOHandler) callback(c *gin.Context, platform, action string) {
	code := c.Query("code")
	state := c.Query("state")
	target, userID, username, err := h.svc.CallbackRedirect(c.Request.Context(), platform, code, state)
	if userID != 0 {
		middleware.RecordLogin(c, action, userID, username, err == nil, errText(err))
	}
	if err != nil && target == "" {
		// 连回调页 origin 都拿不到(配置缺失):直接 JSON 报错,避免静默白屏
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	c.Redirect(302, target)
}

// errText 空 error 归一空串(RecordLogin errMsg 参数口径)。
func errText(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
