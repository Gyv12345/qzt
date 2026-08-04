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

// PoolHandler 公海池管理。
type PoolHandler struct {
	svc *service.PoolService
}

func NewPoolHandler() *PoolHandler {
	return &PoolHandler{svc: service.NewPoolService()}
}

// CreatePool 创建公海池
// @Summary  创建公海池
// @Tags     公海池
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreatePoolRequest  true  "创建公海池请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customer-pools [post]
func (h *PoolHandler) CreatePool(c *gin.Context) {
	var req service.CreatePoolRequest
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

// GetPool 公海池详情
// @Summary  公海池详情
// @Tags     公海池
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "公海池ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customer-pools/{id} [get]
func (h *PoolHandler) GetPool(c *gin.Context) {
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

// UpdatePool 更新公海池
// @Summary  更新公海池
// @Tags     公海池
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "公海池ID"
// @Param    body  body      service.UpdatePoolRequest  true  "更新公海池请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customer-pools/{id} [put]
func (h *PoolHandler) UpdatePool(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdatePoolRequest
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

// DeletePool 删除公海池
// @Summary  删除公海池
// @Tags     公海池
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "公海池ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customer-pools/{id} [delete]
func (h *PoolHandler) DeletePool(c *gin.Context) {
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

// ListPools 公海池列表(管理端,含禁用)
// @Summary  公海池列表
// @Description  返回全部公海池(含已禁用),供管理端使用
// @Tags     公海池
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customer-pools [get]
func (h *PoolHandler) ListPools(c *gin.Context) {
	list, err := h.svc.ListPools(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ListEnabledPools 列出启用的公海池
// @Summary  列出启用的公海池
// @Tags     公海池
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customer-pools/enabled [get]
func (h *PoolHandler) ListEnabledPools(c *gin.Context) {
	list, err := h.svc.ListEnabledPools(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// SetPickRule 设置领取规则
// @Summary  设置领取规则
// @Tags     公海池
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "公海池ID"
// @Param    body  body      crm.CrmCustomerPoolPickRule  true  "领取规则"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customer-pools/{id}/pick-rule [put]
func (h *PoolHandler) SetPickRule(c *gin.Context) {
	poolID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var rule crmmodel.CrmCustomerPoolPickRule
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

// SetRecycleRule 设置回收规则
// @Summary  设置回收规则
// @Tags     公海池
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "公海池ID"
// @Param    body  body      crm.CrmCustomerPoolRecycleRule  true  "回收规则"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customer-pools/{id}/recycle-rule [put]
func (h *PoolHandler) SetRecycleRule(c *gin.Context) {
	poolID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var rule crmmodel.CrmCustomerPoolRecycleRule
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

// SetCapacity 设置客户容量
// @Summary  设置客户容量
// @Tags     公海池
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.SetCapacityRequest  true  "设置容量请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/customer-pools/capacity [post]
func (h *PoolHandler) SetCapacity(c *gin.Context) {
	var req service.SetCapacityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	cap, err := h.svc.SetCapacity(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, cap)
}

// ManualRecycle 手动触发回收
// @Summary  手动触发回收
// @Tags     公海池
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "公海池ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/customer-pools/{id}/recycle [post]
func (h *PoolHandler) ManualRecycle(c *gin.Context) {
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
