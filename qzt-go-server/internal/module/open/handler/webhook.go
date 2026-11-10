// webhook.go Webhook 管理端 handler。
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/open/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// WebhookHandler Webhook 配置与投递日志管理。
type WebhookHandler struct {
	svc *service.WebhookService
}

func NewWebhookHandler() *WebhookHandler {
	return &WebhookHandler{svc: service.NewWebhookService()}
}

// List Webhook列表
// @Summary  Webhook列表
// @Description  列出全部 webhook 端点(secret 脱敏)
// @Tags     开放集成
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhooks [get]
func (h *WebhookHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": len(list)})
}

// Create 创建Webhook
// @Summary  创建Webhook
// @Description  创建 webhook 端点;secret 缺省服务端生成,明文仅创建响应返回一次
// @Tags     开放集成
// @Accept   json
// @Produce  json
// @Param    body  body  service.WebhookPayload  true  "配置"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhooks [post]
func (h *WebhookHandler) Create(c *gin.Context) {
	var req service.WebhookPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := c.GetUint(middleware.CtxUserIDKey)
	w, secret, err := h.svc.Create(c.Request.Context(), &req, userID)
	if err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, gin.H{"webhook": w, "secret": secret})
}

// Get Webhook详情
// @Summary  Webhook详情
// @Tags     开放集成
// @Produce  json
// @Param    id  path  int  true  "ID"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhooks/:id [get]
func (h *WebhookHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	w, err := h.svc.Get(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, w)
}

// Update 更新Webhook
// @Summary  更新Webhook
// @Description  更新端点配置;事件码校验同创建
// @Tags     开放集成
// @Accept   json
// @Produce  json
// @Param    id    path  int                    true  "ID"
// @Param    body  body  service.WebhookPayload true  "配置"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhooks/:id [put]
func (h *WebhookHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.WebhookPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// SetStatus 启停Webhook
// @Summary  启停Webhook
// @Tags     开放集成
// @Accept   json
// @Produce  json
// @Param    id    path  int  true  "ID"
// @Param    body  body  object  true  "{status:1启用/0停用}"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhooks/:id/status [put]
func (h *WebhookHandler) SetStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req struct {
		Status *int8 `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SetStatus(c.Request.Context(), uint(id), *req.Status); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListEvents 投递日志列表
// @Summary  投递日志列表
// @Description  分页查询 webhook 投递日志(webhook/事件/状态/时间窗过滤)
// @Tags     开放集成
// @Produce  json
// @Param    webhook_id  query  int    false  "webhookID"
// @Param    event_type  query  string false  "事件类型"
// @Param    status      query  int    false  "0待投递 1成功 2失败重试中 3死信"
// @Param    page        query  int    false  "页码"
// @Param    page_size   query  int    false  "每页"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhook-events [get]
func (h *WebhookHandler) ListEvents(c *gin.Context) {
	webhookID, _ := strconv.ParseUint(c.Query("webhook_id"), 10, 64)
	status := int8(-1)
	if sp := c.Query("status"); sp != "" {
		if v, err := strconv.Atoi(sp); err == nil {
			status = int8(v)
		}
	}
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := h.svc.ListPage(c.Request.Context(), uint(webhookID), c.Query("event_type"), int8(status), page, pageSize, c.Query("start"), c.Query("end"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// RetryEvent 重试投递
// @Summary  重试投递
// @Description  将失败/死信事件置回待投递,由投递 job 重新发送
// @Tags     开放集成
// @Produce  json
// @Param    id  path  int  true  "事件ID"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhook-events/:id/retry [post]
func (h *WebhookHandler) RetryEvent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.RetryEvent(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除Webhook
// @Summary  删除Webhook
// @Description  软删端点;投递日志保留可查
// @Tags     开放集成
// @Produce  json
// @Param    id  path  int  true  "ID"
// @Success  200  {object}  xresponse.Response
// @Router   /open/webhooks/:id [delete]
func (h *WebhookHandler) Delete(c *gin.Context) {
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
