package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// ticket.go 售后工单 handler。

type TicketHandler struct {
	svc *service.TicketService
}

func NewTicketHandler() *TicketHandler { return &TicketHandler{svc: service.NewTicketService()} }

// List 工单列表
// @Summary      售后工单列表
// @Tags         CRM-工单
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码"
// @Param        page_size   query  int     false  "每页条数"
// @Param        keyword     query  string  false  "关键词"
// @Param        category    query  string  false  "问题类型"
// @Param        status      query  int     false  "状态"
// @Param        priority    query  int     false  "优先级"
// @Param        customer_id query  int     false  "客户ID"
// @Param        handler_id  query  int     false  "处理人ID"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/tickets [get]
func (h *TicketHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	priority, _ := strconv.Atoi(c.DefaultQuery("priority", "0"))
	customerID, _ := strconv.ParseUint(c.Query("customer_id"), 10, 64)
	handlerID, _ := strconv.ParseUint(c.Query("handler_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, c.Query("keyword"), c.Query("category"), int8(status), int8(priority), uint(customerID), uint(handlerID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 工单详情(含处理日志)
// @Summary      工单详情
// @Tags         CRM-工单
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "工单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/tickets/{id} [get]
func (h *TicketHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	detail, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, detail)
}

// Create 新建工单
// @Summary      新建工单
// @Tags         CRM-工单
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateTicketRequest  true  "工单"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/tickets [post]
func (h *TicketHandler) Create(c *gin.Context) {
	var req service.CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	t, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, t)
}

// Update 编辑工单
// @Summary      编辑工单
// @Tags         CRM-工单
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "工单ID"
// @Param        body  body  service.UpdateTicketRequest  true  "工单"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/tickets/{id} [put]
func (h *TicketHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateTicketRequest
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

// ChangeStatus 变更工单状态(写处理日志)
// @Summary      变更工单状态
// @Tags         CRM-工单
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "工单ID"
// @Param        body  body  service.ChangeStatusRequest  true  "状态变更"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/tickets/{id}/status [put]
func (h *TicketHandler) ChangeStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.ChangeStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.ChangeStatus(c.Request.Context(), uint(id), &req, middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除工单
// @Summary      删除工单
// @Tags         CRM-工单
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "工单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /crm/tickets/{id} [delete]
func (h *TicketHandler) Delete(c *gin.Context) {
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
