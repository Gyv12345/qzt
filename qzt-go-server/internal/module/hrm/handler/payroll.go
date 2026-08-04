package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/hrm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// PayrollHandler 薪酬管理。
type PayrollHandler struct {
	svc *service.PayrollService
}

func NewPayrollHandler() *PayrollHandler {
	return &PayrollHandler{svc: service.NewPayrollService()}
}

// SaveStructure 保存薪酬结构
// @Summary      保存薪酬结构
// @Tags         薪酬管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.SaveStructureRequest  true  "薪酬结构"
// @Success      200   {object}  xresponse.Response
// @Router       /hrm/payroll/structure [put]
func (h *PayrollHandler) SaveStructure(c *gin.Context) {
	var req service.SaveStructureRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	s, err := h.svc.SaveStructure(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, s)
}

// GetStructure 查询薪酬结构
// @Summary      查询薪酬结构
// @Tags         薪酬管理
// @Produce      json
// @Security     BearerAuth
// @Param        employee_id  query  int  true  "员工ID"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/payroll/structure [get]
func (h *PayrollHandler) GetStructure(c *gin.Context) {
	empID, _ := strconv.ParseUint(c.Query("employee_id"), 10, 64)
	if empID == 0 {
		response.Fail(c, errcode.ErrParam, "employee_id 必填")
		return
	}
	s, err := h.svc.GetStructure(c.Request.Context(), uint(empID))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, s)
}

// GeneratePayroll 生成工资条
// @Summary      生成月度工资条
// @Description  自动计算应发/社保/公积金/个税/实发
// @Tags         薪酬管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.GeneratePayrollRequest  true  "生成请求"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/payroll/generate [post]
func (h *PayrollHandler) GeneratePayroll(c *gin.Context) {
	var req service.GeneratePayrollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	p, err := h.svc.GeneratePayroll(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, p)
}

// PayrollList 工资条列表
// @Summary      工资条列表
// @Tags         薪酬管理
// @Produce      json
// @Security     BearerAuth
// @Param        year_month     query  string  false  "年月(yyyy-MM)"
// @Param        department_id  query  int     false  "部门ID"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/payroll [get]
func (h *PayrollHandler) PayrollList(c *gin.Context) {
	deptID, _ := strconv.ParseUint(c.Query("department_id"), 10, 64)
	list, err := h.svc.PayrollList(c.Request.Context(), c.Query("year_month"), uint(deptID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ConfirmPayroll 确认工资条
// @Summary      确认工资条
// @Tags         薪酬管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "工资条ID"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/payroll/{id}/confirm [put]
func (h *PayrollHandler) ConfirmPayroll(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.ConfirmPayroll(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// MarkPaid 标记已发放
// @Summary      标记工资已发放
// @Tags         薪酬管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "工资条ID"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/payroll/{id}/paid [put]
func (h *PayrollHandler) MarkPaid(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.MarkPaid(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
