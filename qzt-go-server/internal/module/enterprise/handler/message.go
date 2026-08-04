package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// MessageHandler 站内信(消息中心)。
type MessageHandler struct {
	svc *service.MessageService
}

func NewMessageHandler() *MessageHandler { return &MessageHandler{svc: service.NewMessageService()} }

// Inbox 收件箱
// @Summary      收件箱
// @Description  当前用户的收件箱(分页)
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/inbox [get]
func (h *MessageHandler) Inbox(c *gin.Context) {
	p := syservice.GetPagination(c)
	userID := middleware.GetUserID(c)
	list, total, err := h.svc.Inbox(c.Request.Context(), p.Page, p.PageSize, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Outbox 发件箱
// @Summary      发件箱
// @Description  当前用户的发件箱(分页)
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/outbox [get]
func (h *MessageHandler) Outbox(c *gin.Context) {
	p := syservice.GetPagination(c)
	userID := middleware.GetUserID(c)
	list, total, err := h.svc.Outbox(c.Request.Context(), p.Page, p.PageSize, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// UnreadCount 未读数
// @Summary      未读消息数
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/unread-count [get]
func (h *MessageHandler) UnreadCount(c *gin.Context) {
	userID := middleware.GetUserID(c)
	count, err := h.svc.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"unread_count": count})
}

// GetByID 消息详情
// @Summary      消息详情
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "消息ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/{id} [get]
func (h *MessageHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	msg, err := h.svc.GetByID(c.Request.Context(), uint(id), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, msg)
}

// Send 发送消息
// @Summary      发送消息
// @Description  当前用户向其他用户发送站内信
// @Tags         消息中心
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.SendMessageRequest  true  "发送消息请求"
// @Success      200   {object}  xresponse.Response
// @Router       /enterprise/messages [post]
func (h *MessageHandler) Send(c *gin.Context) {
	var req service.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Send(c.Request.Context(), userID, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// MarkAsRead 标记已读
// @Summary      标记消息已读
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "消息ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/{id}/read [put]
func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.MarkAsRead(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// MarkAllAsRead 全部已读
// @Summary      全部已读
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/read-all [put]
func (h *MessageHandler) MarkAllAsRead(c *gin.Context) {
	userID := middleware.GetUserID(c)
	count, err := h.svc.MarkAllAsRead(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"count": count})
}

// MarkAsReadByIds 批量已读
// @Summary      批量已读
// @Tags         消息中心
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "消息ID列表"  example({"ids":[1,2,3]})
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/read-batch [put]
func (h *MessageHandler) MarkAsReadByIds(c *gin.Context) {
	var body struct {
		IDs []uint `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	count, err := h.svc.MarkAsReadByIds(c.Request.Context(), body.IDs, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"count": count})
}

// Delete 删除消息
// @Summary      删除消息
// @Tags         消息中心
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "消息ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/messages/{id} [delete]
func (h *MessageHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Delete(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
