package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// LeadPoolHandler 线索公海池管理。
type LeadPoolHandler struct {
	svc *service.LeadPoolService
}

func NewLeadPoolHandler() *LeadPoolHandler {
	return &LeadPoolHandler{svc: service.NewLeadPoolService()}
}

// CreatePool 创建线索公海池
func (h *LeadPoolHandler) CreatePool(c *gin.Context) {
	var req service.CreateLeadPoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	pool, err := h.svc.CreatePool(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, pool)
}

// GetPool 线索公海池详情
func (h *LeadPoolHandler) GetPool(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	pool, err := h.svc.GetPool(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, pool)
}

// UpdatePool 更新线索公海池
func (h *LeadPoolHandler) UpdatePool(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateLeadPoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdatePool(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeletePool 删除线索公海池
func (h *LeadPoolHandler) DeletePool(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeletePool(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListPools 线索公海池列表(管理端,含禁用)
func (h *LeadPoolHandler) ListPools(c *gin.Context) {
	list, err := h.svc.ListPools(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ListEnabledPools 列出启用的线索公海池
func (h *LeadPoolHandler) ListEnabledPools(c *gin.Context) {
	list, err := h.svc.ListEnabledPools(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// SetPickRule 设置线索领取规则
func (h *LeadPoolHandler) SetPickRule(c *gin.Context) {
	poolID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var rule crmmodel.CrmLeadPoolPickRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SetPickRule(c.Request.Context(), uint(poolID), &rule); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// SetRecycleRule 设置线索回收规则
func (h *LeadPoolHandler) SetRecycleRule(c *gin.Context) {
	poolID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var rule crmmodel.CrmLeadPoolRecycleRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SetRecycleRule(c.Request.Context(), uint(poolID), &rule); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ManualRecycle 手动触发线索回收
func (h *LeadPoolHandler) ManualRecycle(c *gin.Context) {
	poolID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	count, err := h.svc.ManualRecycle(c.Request.Context(), uint(poolID), middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"recycled": count})
}
