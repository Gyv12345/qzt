package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/marketing/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// AccountHandler 营销渠道账号管理 + OAuth 回调。
type AccountHandler struct {
	svc *service.AccountService
}

func NewAccountHandler() *AccountHandler {
	return &AccountHandler{svc: service.NewAccountService()}
}

// List 渠道账号列表
// @Summary  渠道账号列表
// @Description  列出全部营销渠道账号(token 字段脱敏不返回)
// @Tags     营销
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/accounts [get]
func (h *AccountHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": len(list)})
}

// Create 新增渠道账号
// @Summary  新增渠道账号
// @Description  新增巨量引擎渠道账号(状态=待授权)
// @Tags     营销
// @Accept   json
// @Produce  json
// @Param    body  body  service.AccountPayload  true  "账号信息"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/accounts [post]
func (h *AccountHandler) Create(c *gin.Context) {
	var req service.AccountPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	account, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, account)
}

// Update 编辑渠道账号
// @Summary  编辑渠道账号
// @Description  编辑账号;secret 留空保留原值;AppID/Secret 变化会重置为待授权
// @Tags     营销
// @Accept   json
// @Produce  json
// @Param    id    path  int                    true  "账号ID"
// @Param    body  body  service.AccountPayload true  "账号信息"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/accounts/:id [put]
func (h *AccountHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.AccountPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除渠道账号
// @Summary  删除渠道账号
// @Description  软删账号;同步日志保留可查
// @Tags     营销
// @Produce  json
// @Param    id  path  int  true  "账号ID"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/accounts/:id [delete]
func (h *AccountHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// AuthorizeURL 生成授权链接
// @Summary  生成巨量授权链接
// @Description  生成 OAuth 授权链接(state 存 Redis 5 分钟);redirect_uri 由前端按当前后台域名推导
// @Tags     营销
// @Produce  json
// @Param    id           path   int     true  "账号ID"
// @Param    redirect_uri query  string  true  "授权回调地址"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/accounts/:id/authorize-url [get]
func (h *AccountHandler) AuthorizeURL(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	url, err := h.svc.AuthorizeURL(c.Request.Context(), uint(id), c.Query("redirect_uri"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"url": url})
}

// Sync 立即同步线索
// @Summary  立即同步线索
// @Description  手动触发一次该账号的飞鱼线索拉取(同步执行,返回统计)
// @Tags     营销
// @Produce  json
// @Param    id  path  int  true  "账号ID"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/accounts/:id/sync [post]
func (h *AccountHandler) Sync(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	result, err := service.NewSyncService().SyncAccount(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// OAuthCallback 巨量 OAuth 回调
// @Summary  巨量 OAuth 回调(公开)
// @Description  免鉴权。巨量授权完成后重定向到此,校验 state 换 token,返回简单结果页
// @Tags     公共接口
// @Produce  html
// @Param    auth_code  query  string  true  "授权码"
// @Param    state      query  string  true  "授权状态"
// @Success  200  {string}  string  "HTML 结果页"
// @Router   /marketing/oauth/callback [get]
func (h *AccountHandler) OAuthCallback(c *gin.Context) {
	errMsg := h.svc.HandleOAuthCallback(c.Request.Context(), c.Query("auth_code"), c.Query("state"))
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(callbackPage(errMsg)))
}

// callbackPage 授权结果页(简单 HTML,不跳转,规避私有化部署域名写死)。
func callbackPage(errMsg string) string {
	title, body, color := "授权成功", "抖音广告账户授权成功,线索同步已开启。请关闭本页,回到后台「营销-渠道账号」查看。", "#52c41a"
	if errMsg != "" {
		title, body, color = "授权失败", errMsg+"。请回到后台重新发起授权。", "#ff4d4f"
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title></head>
<body style="font-family:-apple-system,sans-serif;display:flex;justify-content:center;padding-top:96px;background:#f5f5f5">
<div style="background:#fff;border-radius:8px;padding:32px 40px;max-width:420px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
<h2 style="color:%s;margin:0 0 12px">%s</h2>
<p style="color:#666;line-height:1.8;margin:0">%s</p>
</div></body></html>`, title, color, title, body)
}
