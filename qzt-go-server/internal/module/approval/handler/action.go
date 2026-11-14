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

// Transfer 转办/委托
// @Summary      转办/委托审批任务
// @Description  将分配给自己的待办任务转办(TRANSFER,责任让渡)或委托(DELEGATE,受托代审)给其他用户;原地改审批人,写审计记录并通知新审批人
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.TransferRequest  true  "转办/委托请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/transfer [post]
func (h *ActionHandler) Transfer(c *gin.Context) {
	var req service.TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Transfer(c.Request.Context(), &req, userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// AddSign 加签
// @Summary      审批加签
// @Description  为当前任务插入串行加签链(BEFORE 前加签:原任务挂起,链全批后恢复;AFTER 后加签:原任务先通过,链在其后,链尾批后流程续走);仅当前任务审批人本人可操作
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.AddSignRequest  true  "加签请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/add-sign [post]
func (h *ActionHandler) AddSign(c *gin.Context) {
	var req service.AddSignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.AddSign(c.Request.Context(), &req, userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// RemoveSign 减签
// @Summary      审批减签
// @Description  撤销链上仍未轮到(PENDING)的加签任务;仅加签发起人可撤,撤销后若链已无人待处理则提前收尾
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.RemoveSignRequest  true  "减签请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/remove-sign [post]
func (h *ActionHandler) RemoveSign(c *gin.Context) {
	var req service.RemoveSignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.RemoveSign(c.Request.Context(), &req, userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ReturnBack 退回
// @Summary      审批退回
// @Description  把审批实例打回到指定已审节点(目标节点按轮次+1 重建任务,打回节点之后的旧任务含加签链整体作废);仅当前任务审批人可操作,可退回节点列表见详情接口 returnable_nodes
// @Tags         审批操作
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.ReturnBackRequest  true  "退回请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/actions/return-back [post]
func (h *ActionHandler) ReturnBack(c *gin.Context) {
	var req service.ReturnBackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.ReturnBack(c.Request.Context(), &req, userID); err != nil {
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
