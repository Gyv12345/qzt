package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// supplier.go 供应商管理 handler。

// SupplierHandler 供应商管理。
type SupplierHandler struct {
	svc *service.SupplierService
}

func NewSupplierHandler() *SupplierHandler {
	return &SupplierHandler{svc: service.NewSupplierService()}
}

// Create 创建供应商
// @Summary  创建供应商
// @Tags     进销存-供应商管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateSupplierRequest  true  "创建供应商请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/suppliers [post]
func (h *SupplierHandler) Create(c *gin.Context) {
	var req service.CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	sup, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, sup)
}

// List 供应商列表
// @Summary  供应商列表
// @Tags     进销存-供应商管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int     false  "页码"
// @Param    page_size  query  int     false  "每页条数"
// @Param    keyword    query  string  false  "名称/编号"
// @Param    status     query  int     false  "状态"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/suppliers [get]
func (h *SupplierHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 供应商详情
// @Summary  供应商详情
// @Tags     进销存-供应商管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "供应商ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/suppliers/{id} [get]
func (h *SupplierHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	sup, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, sup)
}

// Update 更新供应商
// @Summary  更新供应商
// @Tags     进销存-供应商管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                          true  "供应商ID"
// @Param    body  body  service.UpdateSupplierRequest  true  "更新供应商请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/suppliers/{id} [put]
func (h *SupplierHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	var req service.UpdateSupplierRequest
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

// Delete 删除供应商
// @Summary  删除供应商
// @Tags     进销存-供应商管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "供应商ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/suppliers/{id} [delete]
func (h *SupplierHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListEnabled 启用供应商下拉
// @Summary  启用供应商下拉
// @Tags     进销存-供应商管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /psi/suppliers/enabled [get]
func (h *SupplierHandler) ListEnabled(c *gin.Context) {
	list, err := h.svc.ListEnabled(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
