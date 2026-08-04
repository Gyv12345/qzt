package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/approval/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ActionHandler 审批操作(提审/通过/驳回/撤回)。
type ActionHandler struct {
	svc *service.ApprovalService
}

func NewActionHandler() *ActionHandler { return &ActionHandler{svc: service.NewApprovalService()} }

// Push 提审
// @Summary      提交审批
// @Description  将业务资源提交审批(创建实例,按流程分配审批任务)
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.PushRequest  true  "提审请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/push [post]
func (h *ActionHandler) Push(c *gin.Context) {
	var req service.PushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	instance, err := h.svc.Push(c.Request.Context(), &req, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, instance)
}

// Approve 审批通过
// @Summary      审批通过
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.ApproveRequest  true  "通过请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/approve [post]
func (h *ActionHandler) Approve(c *gin.Context) {
	var req service.ApproveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Approve(c.Request.Context(), &req, userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Reject 驳回
// @Summary      审批驳回
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.RejectRequest  true  "驳回请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/reject [post]
func (h *ActionHandler) Reject(c *gin.Context) {
	var req service.RejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Reject(c.Request.Context(), &req, userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Revoke 撤回
// @Summary      撤回审批
// @Description  提交人撤回审批中的实例
// @Tags         审批操作
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "实例ID"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/instances/{id}/revoke [put]
func (h *ActionHandler) Revoke(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Revoke(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
