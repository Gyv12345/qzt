package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/hrm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// DepartmentHandler 部门管理。
type DepartmentHandler struct {
	svc *service.DepartmentService
}

func NewDepartmentHandler() *DepartmentHandler {
	return &DepartmentHandler{svc: service.NewDepartmentService()}
}

// List 部门列表
// @Summary  部门列表
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    keyword  query  string  false  "部门名称模糊"
// @Param    status   query  int     false  "状态(1正常 0禁用)"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/departments [get]
func (h *DepartmentHandler) List(c *gin.Context) {
	status, _ := strconv.ParseInt(c.Query("status"), 10, 8)
	list, err := h.svc.List(c.Request.Context(), c.Query("keyword"), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// Tree 部门树
// @Summary  部门树(下拉用,免RBAC)
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/departments/tree [get]
func (h *DepartmentHandler) Tree(c *gin.Context) {
	tree, err := h.svc.Tree(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}

// GetByID 部门详情
// @Summary  部门详情
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "部门ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/departments/{id} [get]
func (h *DepartmentHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	dept, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dept)
}

// Create 创建部门
// @Summary  创建部门
// @Tags     人力资源管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.CreateDepartmentRequest  true  "创建部门请求"
// @Success  200   {object}  xresponse.Response
// @Router   /hrm/departments [post]
func (h *DepartmentHandler) Create(c *gin.Context) {
	var req service.CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	dept, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, dept)
}

// Update 更新部门
// @Summary  更新部门
// @Tags     人力资源管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                            true  "部门ID"
// @Param    body  body  service.UpdateDepartmentRequest  true  "更新部门请求"
// @Success  200   {object}  xresponse.Response
// @Router   /hrm/departments/{id} [put]
func (h *DepartmentHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateDepartmentRequest
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

// Delete 删除部门
// @Summary  删除部门
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "部门ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/departments/{id} [delete]
func (h *DepartmentHandler) Delete(c *gin.Context) {
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
