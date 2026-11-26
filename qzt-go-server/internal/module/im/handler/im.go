// Package handler 即时通讯(IM)handler。
// 薄层:参数解析 + 调 service + 统一响应;错误码按业务哨兵错误映射。
package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/im/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// IMHandler 即时通讯 handler(JWT-only 层级,同 OA 站内信,无 RBAC)。
type IMHandler struct {
	convSvc *service.ConversationService
	msgSvc  *service.MessageService
}

// NewIMHandler 构造。
func NewIMHandler() *IMHandler {
	return &IMHandler{
		convSvc: service.NewConversationService(),
		msgSvc:  service.NewMessageService(),
	}
}

// failBiz service 错误 → 响应码映射。
func failBiz(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrNotMember):
		response.Fail(c, errcode.ErrForbidden, err.Error())
	case errors.Is(err, service.ErrConvNotFound), errors.Is(err, service.ErrTargetUserNotFound):
		response.Fail(c, errcode.ErrNotFound, err.Error())
	case errors.Is(err, service.ErrTargetUserDisabled),
		errors.Is(err, service.ErrNotGroup),
		errors.Is(err, service.ErrValidation):
		response.Fail(c, errcode.ErrParam, err.Error())
	default:
		response.Fail(c, errcode.ErrServer, err.Error())
	}
}

// pathUint 解析路径参数为正整数,失败直接写响应并返回 false。
func pathUint(c *gin.Context, name string) (uint, bool) {
	v, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil || v == 0 {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return 0, false
	}
	return uint(v), true
}

// queryUint 解析 query 参数为非负整数(空/非法返回 0)。
func queryUint(c *gin.Context, name string) uint {
	v, err := strconv.ParseUint(c.Query(name), 10, 64)
	if err != nil {
		return 0
	}
	return uint(v)
}

// ListConversations 会话列表
// @Summary      会话列表
// @Description  我的会话列表(含未读数、最新一条消息、单聊对端信息),按最新消息时间倒序(无消息靠后)。
// @Tags         即时通讯
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations [get]
func (h *IMHandler) ListConversations(c *gin.Context) {
	userID := middleware.GetUserID(c)
	list, err := h.convSvc.ListConversations(c.Request.Context(), userID)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, list)
}

// CreateSingle 创建单聊
// @Summary      创建单聊会话
// @Description  与目标用户建立(或返回已有)单聊会话;幂等:同一对用户只会有一个单聊会话。
// @Tags         即时通讯
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateSingleRequest  true  "目标用户ID"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/single [post]
func (h *IMHandler) CreateSingle(c *gin.Context) {
	var req service.CreateSingleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	conv, err := h.convSvc.CreateSingle(c.Request.Context(), userID, req)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, conv)
}

// CreateGroup 创建群聊
// @Summary      创建群聊会话
// @Description  创建群聊;创建人自动入群,member_ids 去重并忽略创建人自身。
// @Tags         即时通讯
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateGroupRequest  true  "群名称与成员"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/group [post]
func (h *IMHandler) CreateGroup(c *gin.Context) {
	var req service.CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	conv, err := h.convSvc.CreateGroup(c.Request.Context(), userID, req)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, conv)
}

// ListMessages 消息列表
// @Summary      会话消息分页
// @Description  按 id 倒序分页;before_id 独占(取 id 小于该值的消息,用于上滑加载更早一页);仅会话成员可读。
// @Tags         即时通讯
// @Produce      json
// @Security     BearerAuth
// @Param        id         path   int  false  "会话ID"
// @Param        before_id  query  int  false  "翻页游标:取 id 小于该值的消息"
// @Param        limit      query  int  false  "每页条数(默认20,1~50)"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/{id}/messages [get]
func (h *IMHandler) ListMessages(c *gin.Context) {
	convID, ok := pathUint(c, "id")
	if !ok {
		return
	}
	userID := middleware.GetUserID(c)
	list, err := h.msgSvc.ListMessages(c.Request.Context(), userID, convID, queryUint(c, "before_id"), int(queryUint(c, "limit")))
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, list)
}

// SendMessage 发送消息
// @Summary      发送消息
// @Description  向会话发送文本消息;仅会话成员可发;成功后向会话全部成员(含发送人)推送 im_message SSE 事件。
// @Tags         即时通讯
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int                            true  "会话ID"
// @Param        body  body  service.IMSendMessageRequest  true  "消息内容(content_type 默认 text,v1 仅支持 text)"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/{id}/messages [post]
func (h *IMHandler) SendMessage(c *gin.Context) {
	convID, ok := pathUint(c, "id")
	if !ok {
		return
	}
	var req service.IMSendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	msg, err := h.msgSvc.SendMessage(c.Request.Context(), userID, convID, req)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, msg)
}

// MarkRead 标记已读
// @Summary      标记会话已读
// @Description  把我的已读游标推进到会话最新一条消息,返回最新消息 ID(无消息为 0)。
// @Tags         即时通讯
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int    true  "会话ID"
// @Param        body  body  object true  "空对象"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/{id}/read [put]
func (h *IMHandler) MarkRead(c *gin.Context) {
	convID, ok := pathUint(c, "id")
	if !ok {
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.convSvc.MarkRead(c.Request.Context(), userID, convID)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, result)
}

// AddMembers 添加群成员
// @Summary      添加群成员
// @Description  群聊成员可添加成员;校验用户存在;输入去重;已是成员的自动跳过,返回实际新增数。
// @Tags         即时通讯
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int                       true  "会话ID"
// @Param        body  body  service.AddMembersRequest  true  "用户ID列表"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/{id}/members [post]
func (h *IMHandler) AddMembers(c *gin.Context) {
	convID, ok := pathUint(c, "id")
	if !ok {
		return
	}
	var req service.AddMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.convSvc.AddMembers(c.Request.Context(), userID, convID, req)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, result)
}

// RemoveMember 移除群成员
// @Summary      移除群成员
// @Description  群聊移除成员(成员行硬删除,可重新加入)。可自退;移除群主时群主自动转移给最早加入的剩余成员,无人剩余则解散会话。
// @Tags         即时通讯
// @Produce      json
// @Security     BearerAuth
// @Param        id       path  int  true  "会话ID"
// @Param        userId   path  int  true  "被移除用户ID"
// @Success      200  {object}  xresponse.Response
// @Router       /im/conversations/{id}/members/{userId} [delete]
func (h *IMHandler) RemoveMember(c *gin.Context) {
	convID, ok := pathUint(c, "id")
	if !ok {
		return
	}
	targetID, ok := pathUint(c, "userId")
	if !ok {
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.convSvc.RemoveMember(c.Request.Context(), userID, convID, targetID)
	if err != nil {
		failBiz(c, err)
		return
	}
	response.OK(c, result)
}
