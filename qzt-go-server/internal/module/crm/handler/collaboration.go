package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// CollaborationHandler 客户团队协作。
type CollaborationHandler struct {
	svc *service.CollaborationService
}

func NewCollaborationHandler() *CollaborationHandler {
	return &CollaborationHandler{svc: service.NewCollaborationService()}
}

// List 列出客户的协作成员
// @Summary  客户协作成员列表
// @Tags     客户团队协作
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "客户ID"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customers/{id}/collaborations [get]
func (h *CollaborationHandler) List(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.List(c.Request.Context(), uint(customerID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Add 添加协作成员
// @Summary  添加协作成员
// @Tags     客户团队协作
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "客户ID"
// @Param    body  body      service.AddCollaboratorRequest  true  "添加协作成员请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customers/{id}/collaborations [post]
func (h *CollaborationHandler) Add(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.AddCollaboratorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Add(c.Request.Context(), uint(customerID), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Update 更新协作成员权限
// @Summary  更新协作成员权限
// @Tags     客户团队协作
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "协作ID"
// @Param    body  body      service.UpdateCollaboratorRequest  true  "更新协作成员请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/collaborations/{id} [put]
func (h *CollaborationHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateCollaboratorRequest
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

// Delete 移除协作成员
// @Summary  移除协作成员
// @Tags     客户团队协作
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "协作ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/collaborations/{id} [delete]
func (h *CollaborationHandler) Delete(c *gin.Context) {
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
