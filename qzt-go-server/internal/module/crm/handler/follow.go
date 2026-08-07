package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// FollowHandler 跟进管理:记录 + 计划 + 待办。
type FollowHandler struct {
	svc *service.FollowService
}

func NewFollowHandler() *FollowHandler {
	return &FollowHandler{svc: service.NewFollowService()}
}

// ── 跟进记录 ──

// CreateRecord 创建跟进记录
// @Summary  创建跟进记录
// @Tags     跟进管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateRecordRequest  true  "创建跟进记录请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/follow-records [post]
func (h *FollowHandler) CreateRecord(c *gin.Context) {
	var req service.CreateRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	req.OwnerID = middleware.GetUserID(c) // 从当前登录用户获取,前端不需要传
	rec, err := h.svc.CreateRecord(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rec)
}

// GetRecord 跟进记录详情
// @Summary  跟进记录详情
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "记录ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-records/{id} [get]
func (h *FollowHandler) GetRecord(c *gin.Context) {
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

// UpdateRecord 更新跟进记录
// @Summary  更新跟进记录
// @Tags     跟进管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "记录ID"
// @Param    body  body      service.UpdateRecordRequest  true  "更新跟进记录请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/follow-records/{id} [put]
func (h *FollowHandler) UpdateRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateRecordRequest
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

// DeleteRecord 删除跟进记录
// @Summary  删除跟进记录
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "记录ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-records/{id} [delete]
func (h *FollowHandler) DeleteRecord(c *gin.Context) {
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

// Timeline 跟进记录时间线
// @Summary  按资源查跟进记录时间线
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    field  query  string  true  "资源列名(lead_id/customer_id/opportunity_id/contact_id/contract_id)"
// @Param    value  query  int     true  "资源ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-records/timeline [get]
func (h *FollowHandler) Timeline(c *gin.Context) {
	field := c.Query("field")
	if field == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: field 不能为空")
		return
	}
	value, err := strconv.ParseUint(c.Query("value"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: value 无效")
		return
	}
	list, err := h.svc.Timeline(c.Request.Context(), field, uint(value))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 跟进计划 ──

// CreatePlan 创建跟进计划
// @Summary  创建跟进计划
// @Tags     跟进管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreatePlanRequest  true  "创建跟进计划请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/follow-plans [post]
func (h *FollowHandler) CreatePlan(c *gin.Context) {
	var req service.CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	plan, err := h.svc.CreatePlan(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, plan)
}

// GetPlan 跟进计划详情
// @Summary  跟进计划详情
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "计划ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-plans/{id} [get]
func (h *FollowHandler) GetPlan(c *gin.Context) {
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

// UpdatePlan 更新跟进计划
// @Summary  更新跟进计划
// @Tags     跟进管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "计划ID"
// @Param    body  body      service.UpdatePlanRequest  true  "更新跟进计划请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/follow-plans/{id} [put]
func (h *FollowHandler) UpdatePlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdatePlanRequest
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

// DeletePlan 删除跟进计划
// @Summary  删除跟进计划
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "计划ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-plans/{id} [delete]
func (h *FollowHandler) DeletePlan(c *gin.Context) {
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

// ConvertPlanToRecord 将跟进计划转为记录
// @Summary  将跟进计划转为记录
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "计划ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-plans/{id}/convert [post]
func (h *FollowHandler) ConvertPlanToRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	rec, err := h.svc.ConvertPlanToRecord(c.Request.Context(), uint(id), middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rec)
}

// SkipPlan 跳过跟进计划
// @Summary  跳过跟进计划
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "计划ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-plans/{id}/skip [post]
func (h *FollowHandler) SkipPlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.SkipPlan(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// MyTodos 我的待办跟进计划
// @Summary  我的待办跟进计划
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/follow-plans/my-todos [get]
func (h *FollowHandler) MyTodos(c *gin.Context) {
	list, err := h.svc.MyTodos(c.Request.Context(), middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// WarnConfig 跟进预警配置(阈值天数 + 开关,从 sys_config 读取)。
// 供前端列表判断"是否标红"用。只读。
// @Summary  跟进预警配置
// @Tags     跟进管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/followup/warn-config [get]
func (h *FollowHandler) WarnConfig(c *gin.Context) {
	response.OK(c, service.LoadWarnConfig(c.Request.Context()))
}
