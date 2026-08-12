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

// LeadHandler 线索管理。
type LeadHandler struct {
	svc *service.LeadService
}

func NewLeadHandler() *LeadHandler {
	return &LeadHandler{svc: service.NewLeadService()}
}

// Create 创建线索
func (h *LeadHandler) Create(c *gin.Context) {
	var req service.CreateLeadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	lead, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, lead)
}

// GetByID 线索详情
func (h *LeadHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	lead, fields, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, gin.H{"lead": lead, "fields": fields})
}

// Update 更新线索
func (h *LeadHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateLeadRequest
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

// Delete 删除线索
func (h *LeadHandler) Delete(c *gin.Context) {
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

// List 线索列表(分页 + 主字段过滤)
func (h *LeadHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	level := c.Query("level")
	source := c.Query("source")
	status := c.Query("status")
	industry := c.Query("industry")
	poolFilter := c.Query("pool_filter")
	poolID, _ := strconv.ParseUint(c.Query("pool_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, level, source, status, industry, poolFilter, uint(poolID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ReleaseToPool 释放线索到公海
func (h *LeadHandler) ReleaseToPool(c *gin.Context) {
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

// PickFromPool 从公海领取线索
func (h *LeadHandler) PickFromPool(c *gin.Context) {
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

// Transfer 转移线索
func (h *LeadHandler) Transfer(c *gin.Context) {
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

// OwnerHistory 线索归属变更历史
func (h *LeadHandler) OwnerHistory(c *gin.Context) {
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

// Convert 线索转化为客户
func (h *LeadHandler) Convert(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	customer, err := h.svc.Convert(c.Request.Context(), uint(id), middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, customer)
}
