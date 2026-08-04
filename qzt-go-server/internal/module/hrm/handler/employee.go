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

// EmployeeHandler 员工档案管理。
type EmployeeHandler struct {
	svc *service.EmployeeService
}

func NewEmployeeHandler() *EmployeeHandler {
	return &EmployeeHandler{svc: service.NewEmployeeService()}
}

// List 员工列表
// @Summary  员工列表
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    page          query  int     false  "页码(默认1)"
// @Param    page_size     query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword       query  string  false  "姓名/工号模糊"
// @Param    department_id query  int     false  "部门ID"
// @Param    position_id   query  int     false  "岗位ID"
// @Param    status        query  int     false  "状态(1在职 2试用 3离职)"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/employees [get]
func (h *EmployeeHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	deptID, _ := strconv.ParseUint(c.Query("department_id"), 10, 64)
	positionID, _ := strconv.ParseUint(c.Query("position_id"), 10, 64)
	status, _ := strconv.ParseInt(c.Query("status"), 10, 8)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, c.Query("keyword"), uint(deptID), uint(positionID), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 员工详情
// @Summary  员工详情
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "员工ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/employees/{id} [get]
func (h *EmployeeHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	emp, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, emp)
}

// Create 创建员工
// @Summary  创建员工
// @Tags     人力资源管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.CreateEmployeeRequest  true  "创建员工请求"
// @Success  200   {object}  xresponse.Response
// @Router   /hrm/employees [post]
func (h *EmployeeHandler) Create(c *gin.Context) {
	var req service.CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	emp, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, emp)
}

// Update 更新员工
// @Summary  更新员工
// @Tags     人力资源管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                          true  "员工ID"
// @Param    body  body  service.UpdateEmployeeRequest  true  "更新员工请求"
// @Success  200   {object}  xresponse.Response
// @Router   /hrm/employees/{id} [put]
func (h *EmployeeHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req, middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除员工
// @Summary  删除员工
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "员工ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/employees/{id} [delete]
func (h *EmployeeHandler) Delete(c *gin.Context) {
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

// Changes 员工变更履历
// @Summary  员工变更履历
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "员工ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/employees/{id}/changes [get]
func (h *EmployeeHandler) Changes(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.Changes(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}
