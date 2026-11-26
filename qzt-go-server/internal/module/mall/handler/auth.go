package handler

import (
	"github.com/gin-gonic/gin"

	buyerauth "qzt-go-server/internal/module/mall/buyerauth"
	// 请求类型命名带 Mall 前缀:system/service 的 LoginRequest 与本包同名,
	// swagger 按「短包名.类型名」注册,必须保证类型名全局唯一
	"qzt-go-server/internal/module/mall/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// auth.go 商城买家账号 handler(公开注册/登录 + 买家资料)。
// 本组路由属于「公开层」与「买家层」:不进 sys_api、不走员工 JWT/Casbin,
// 买家 token 与员工 JWT 双向隔离(见 module/mall/buyerauth 包注释)。

// AuthHandler 买家账号 handler。
type AuthHandler struct {
	svc *service.AuthService
}

// NewAuthHandler 构造。
func NewAuthHandler() *AuthHandler { return &AuthHandler{svc: service.NewAuthService()} }

// Register 买家注册(公开)
// @Summary  商城买家注册(公开)
// @Description  手机号(^1[3-9]\\d{9}$)+密码(6-32位,bcrypt 落库)注册买家账号,手机号重复返回友好提示;免鉴权
// @Tags     商城公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.MallRegisterRequest  true  "注册请求"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/public/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req service.MallRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	dto, err := h.svc.Register(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, dto)
}

// Login 买家登录(公开)
// @Summary  商城买家登录(公开)
// @Description  手机号+密码登录,签发买家专用 token(7 天,与员工 JWT 双向隔离不可互认);免鉴权
// @Tags     商城公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.MallLoginRequest  true  "登录请求"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/public/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req service.MallLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	result, err := h.svc.Login(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// Me 买家资料(买家层)
// @Summary  商城买家资料
// @Description  当前登录买家资料(id/手机号/昵称);需买家 token(Authorization: Bearer <mall token>)
// @Tags     商城买家
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /mall/auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	dto, err := h.svc.Me(c.Request.Context(), buyerauth.GetBuyerID(c))
	if err != nil {
		response.Fail(c, syserrcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dto)
}
