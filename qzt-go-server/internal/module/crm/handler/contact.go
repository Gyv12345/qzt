package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ContactHandler 客户联系人。
type ContactHandler struct {
	svc *service.ContactService
}

func NewContactHandler() *ContactHandler {
	return &ContactHandler{svc: service.NewContactService()}
}

// Create 创建联系人
// @Summary  创建联系人
// @Tags     联系人
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "客户ID"
// @Param    body        body      service.CreateContactRequest  true  "创建联系人请求"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/customers/{id}/contacts [post]
func (h *ContactHandler) Create(c *gin.Context) {
	var req service.CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	// 路径 :id 作为权威归属(客户ID)。
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	req.CustomerID = uint(customerID)
	if err := h.svc.Create(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetByID 联系人详情
// @Summary  联系人详情
// @Tags     联系人
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "联系人ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contacts/{id} [get]
func (h *ContactHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	contact, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, contact)
}

// Update 更新联系人
// @Summary  更新联系人
// @Tags     联系人
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "联系人ID"
// @Param    body  body      service.UpdateContactRequest  true  "更新联系人请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/contacts/{id} [put]
func (h *ContactHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateContactRequest
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

// Delete 删除联系人
// @Summary  删除联系人
// @Tags     联系人
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "联系人ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contacts/{id} [delete]
func (h *ContactHandler) Delete(c *gin.Context) {
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

// ListByCustomer 按客户列联系人
// @Summary  按客户列联系人
// @Tags     联系人
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "客户ID"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/customers/{id}/contacts [get]
func (h *ContactHandler) ListByCustomer(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.ListByCustomer(c.Request.Context(), uint(customerID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
