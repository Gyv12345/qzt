package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/hrm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// payroll_config.go 薪酬设置 handler(P16):社保方案/工资项。

// PayrollConfigHandler 薪酬设置。
type PayrollConfigHandler struct {
	svc        *service.PayrollConfigService
	payrollSvc *service.PayrollService
}

func NewPayrollConfigHandler() *PayrollConfigHandler {
	return &PayrollConfigHandler{
		svc:        service.NewPayrollConfigService(),
		payrollSvc: service.NewPayrollService(),
	}
}

// ── 社保方案 ──

// ListPlans 社保方案列表
// @Summary  社保方案列表
// @Tags     人事-薪酬设置
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int  false  "页码"
// @Param    page_size  query  int  false  "每页条数"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/insurance-plans [get]
func (h *PayrollConfigHandler) ListPlans(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListPlans(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreatePlan 新建社保方案
// @Summary  新建社保方案
// @Tags     人事-薪酬设置
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.InsurancePlanRequest  true  "社保方案请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/insurance-plans [post]
func (h *PayrollConfigHandler) CreatePlan(c *gin.Context) {
	var req service.InsurancePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.CreatePlan(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// UpdatePlan 更新社保方案
// @Summary  更新社保方案
// @Tags     人事-薪酬设置
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "方案ID"
// @Param    body  body  service.InsurancePlanRequest  true  "社保方案请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/insurance-plans/{id} [put]
func (h *PayrollConfigHandler) UpdatePlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.InsurancePlanRequest
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

// DeletePlan 删除社保方案
// @Summary  删除社保方案
// @Tags     人事-薪酬设置
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "方案ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/insurance-plans/{id} [delete]
func (h *PayrollConfigHandler) DeletePlan(c *gin.Context) {
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

// ── 工资项 ──

// ListItems 工资项列表
// @Summary  工资项列表
// @Tags     人事-薪酬设置
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int  false  "页码"
// @Param    page_size  query  int  false  "每页条数"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/salary-items [get]
func (h *PayrollConfigHandler) ListItems(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListItems(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateItem 新建工资项
// @Summary  新建工资项
// @Tags     人事-薪酬设置
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.SalaryItemRequest  true  "工资项请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/salary-items [post]
func (h *PayrollConfigHandler) CreateItem(c *gin.Context) {
	var req service.SalaryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.CreateItem(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// UpdateItem 更新工资项
// @Summary  更新工资项
// @Tags     人事-薪酬设置
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "工资项ID"
// @Param    body  body  service.SalaryItemRequest  true  "工资项请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/salary-items/{id} [put]
func (h *PayrollConfigHandler) UpdateItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SalaryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateItem(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteItem 删除工资项
// @Summary  删除工资项
// @Tags     人事-薪酬设置
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "工资项ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/salary-items/{id} [delete]
func (h *PayrollConfigHandler) DeleteItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteItem(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// SaveStructureV2 保存薪酬结构(扩展:支持 plan_id)
// @Summary  保存薪酬结构(支持挂社保方案)
// @Tags     人事-薪酬设置
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.SaveStructureV2Request  true  "薪酬结构请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/payroll/structure/v2 [put]
func (h *PayrollConfigHandler) SaveStructureV2(c *gin.Context) {
	var req service.SaveStructureV2Request
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	o, err := h.payrollSvc.SaveStructureV2(c.Request.Context(), &req, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}
