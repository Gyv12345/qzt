package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// CustomerHandler 客户管理。
type CustomerHandler struct {
	svc *service.CustomerService
}

func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{svc: service.NewCustomerService()}
}

// Create 创建客户
// @Summary  创建客户
// @Tags     客户管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateCustomerRequest  true  "创建客户请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customers [post]
func (h *CustomerHandler) Create(c *gin.Context) {
	var req service.CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	customer, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, customer)
}

// GetByID 客户详情
// @Summary  客户详情
// @Tags     客户管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "客户ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customers/{id} [get]
func (h *CustomerHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	customer, fields, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, gin.H{"customer": customer, "fields": fields})
}

// Update 更新客户
// @Summary  更新客户
// @Tags     客户管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int                        true  "客户ID"
// @Param    body  body      service.UpdateCustomerRequest  true  "更新客户请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customers/{id} [put]
func (h *CustomerHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateCustomerRequest
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

// Delete 删除客户
// @Summary  删除客户
// @Tags     客户管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "客户ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customers/{id} [delete]
func (h *CustomerHandler) Delete(c *gin.Context) {
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

// List 客户列表
// @Summary  客户列表
// @Tags     客户管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int     false  "页码(默认1)"
// @Param    page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword    query  string  false  "客户名称模糊"
// @Param    level      query  string  false  "客户等级"
// @Param    source     query  string  false  "客户来源"
// @Param    status     query  string  false  "客户状态"
// @Param    industry   query  string  false  "行业"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customers [get]
func (h *CustomerHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	level := c.Query("level")
	source := c.Query("source")
	status := c.Query("status")
	industry := c.Query("industry")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, level, source, status, industry)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ReleaseToPool 释放客户到公海
// @Summary  释放客户到公海
// @Tags     客户管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id       path      int     true  "客户ID"
// @Param    pool_id  formData  int     true  "目标公海池ID"
// @Param    reason   formData  string  false "退回原因"
// @Success  200      {object}  xresponse.Response
// @Router   /crm/customers/{id}/release [post]
func (h *CustomerHandler) ReleaseToPool(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req struct {
		PoolID uint   `json:"pool_id" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.ReleaseToPool(c.Request.Context(), uint(id), req.PoolID, middleware.GetUserID(c), req.Reason); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// PickFromPool 从公海领取客户
// @Summary  从公海领取客户
// @Tags     客户管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "客户ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customers/{id}/pick [post]
func (h *CustomerHandler) PickFromPool(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.PickFromPool(c.Request.Context(), uint(id), middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Transfer 转移客户
// @Summary  转移客户给其他用户
// @Tags     客户管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id          path      int  true  "客户ID"
// @Param    to_user_id  formData  int  true  "接收用户ID"
// @Success  200         {object}  xresponse.Response
// @Router   /crm/customers/{id}/transfer [post]
func (h *CustomerHandler) Transfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req struct {
		ToUserID uint `json:"to_user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Transfer(c.Request.Context(), uint(id), req.ToUserID, middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// OwnerHistory 客户归属变更历史
// @Summary  客户归属变更历史
// @Tags     客户管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "客户ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customers/{id}/owner-history [get]
func (h *CustomerHandler) OwnerHistory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.OwnerHistory(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 公开(免鉴权)合作方接口 ──

// PublicList 合作方列表(公开)
// @Summary  合作方/客户列表(公开)
// @Description  返回正常状态(status=1)客户作为官网合作方展示,免鉴权
// @Tags     CMS公开
// @Produce  json
// @Param    page       query  int     false  "页码(默认1)"
// @Param    page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword    query  string  false  "客户名称模糊"
// @Param    industry   query  string  false  "行业"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/public/partners [get]
func (h *CustomerHandler) PublicList(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListPartners(c.Request.Context(), p.Page, p.PageSize, c.Query("keyword"), c.Query("industry"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
