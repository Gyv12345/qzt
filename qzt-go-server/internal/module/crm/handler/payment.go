package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// PaymentHandler 回款管理:计划 + 记录 + 汇总。
type PaymentHandler struct {
	svc *service.PaymentService
}

func NewPaymentHandler() *PaymentHandler {
	return &PaymentHandler{svc: service.NewPaymentService()}
}

// ── 回款计划 ──

// CreatePlan 创建回款计划
// @Summary  创建回款计划
// @Tags     回款管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id          path      int  true  "合同ID"
// @Param    body        body      service.CreatePaymentPlanRequest  true  "创建回款计划请求"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/contracts/{id}/payment-plans [post]
func (h *PaymentHandler) CreatePlan(c *gin.Context) {
	var req service.CreatePaymentPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	contractID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	req.ContractID = uint(contractID)
	plan, err := h.svc.CreatePlan(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, plan)
}

// GetPlan 回款计划详情
// @Summary  回款计划详情
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "计划ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/payment-plans/{id} [get]
func (h *PaymentHandler) GetPlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	plan, err := h.svc.GetPlan(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, plan)
}

// UpdatePlan 更新回款计划
// @Summary  更新回款计划
// @Tags     回款管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "计划ID"
// @Param    body  body      service.UpdatePaymentPlanRequest  true  "更新回款计划请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/payment-plans/{id} [put]
func (h *PaymentHandler) UpdatePlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdatePaymentPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdatePlan(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeletePlan 删除回款计划
// @Summary  删除回款计划
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "计划ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/payment-plans/{id} [delete]
func (h *PaymentHandler) DeletePlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeletePlan(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListPlansByContract 按合同列回款计划
// @Summary  按合同列回款计划
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id          path      int  true  "合同ID"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/contracts/{id}/payment-plans [get]
func (h *PaymentHandler) ListPlansByContract(c *gin.Context) {
	contractID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.ListPlansByContract(c.Request.Context(), uint(contractID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 回款记录 ──

// CreateRecord 创建回款记录
// @Summary  创建回款记录
// @Tags     回款管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id          path      int  true  "合同ID"
// @Param    body        body      service.CreatePaymentRecordRequest  true  "创建回款记录请求"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/contracts/{id}/payment-records [post]
func (h *PaymentHandler) CreateRecord(c *gin.Context) {
	var req service.CreatePaymentRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	contractID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	req.ContractID = uint(contractID)
	rec, err := h.svc.CreateRecord(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rec)
}

// GetRecord 回款记录详情
// @Summary  回款记录详情
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "记录ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/payment-records/{id} [get]
func (h *PaymentHandler) GetRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	rec, err := h.svc.GetRecord(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, rec)
}

// UpdateRecord 更新回款记录
// @Summary  更新回款记录
// @Tags     回款管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "记录ID"
// @Param    body  body      service.UpdatePaymentRecordRequest  true  "更新回款记录请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/payment-records/{id} [put]
func (h *PaymentHandler) UpdateRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdatePaymentRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateRecord(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteRecord 删除回款记录
// @Summary  删除回款记录
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "记录ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/payment-records/{id} [delete]
func (h *PaymentHandler) DeleteRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteRecord(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListRecordsByContract 按合同列回款记录
// @Summary  按合同列回款记录
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id          path      int  true  "合同ID"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/contracts/{id}/payment-records [get]
func (h *PaymentHandler) ListRecordsByContract(c *gin.Context) {
	contractID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.ListRecordsByContract(c.Request.Context(), uint(contractID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 回款汇总 ──

// PaymentSummary 合同回款汇总
// @Summary  合同回款汇总
// @Tags     回款管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/payment-summary [get]
func (h *PaymentHandler) PaymentSummary(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	summary, err := h.svc.ContractPaymentSummary(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, summary)
}
