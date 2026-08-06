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

// OpportunityHandler 商机管理。
type OpportunityHandler struct {
	svc *service.OpportunityService
}

func NewOpportunityHandler() *OpportunityHandler {
	return &OpportunityHandler{svc: service.NewOpportunityService()}
}

// Create 创建商机
// @Summary  创建商机
// @Tags     商机管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateOpportunityRequest  true  "创建商机请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/opportunities [post]
func (h *OpportunityHandler) Create(c *gin.Context) {
	var req service.CreateOpportunityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	opp, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, opp)
}

// GetByID 商机详情
// @Summary  商机详情
// @Tags     商机管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "商机ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/opportunities/{id} [get]
func (h *OpportunityHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	opp, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, opp)
}

// Update 更新商机
// @Summary  更新商机
// @Tags     商机管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "商机ID"
// @Param    body  body      service.UpdateOpportunityRequest  true  "更新商机请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/opportunities/{id} [put]
func (h *OpportunityHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateOpportunityRequest
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

// Delete 删除商机
// @Summary  删除商机
// @Tags     商机管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "商机ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/opportunities/{id} [delete]
func (h *OpportunityHandler) Delete(c *gin.Context) {
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

// List 商机列表
// @Summary  商机列表
// @Tags     商机管理
// @Produce  json
// @Security BearerAuth
// @Param    page        query  int     false  "页码(默认1)"
// @Param    page_size   query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword     query  string  false  "商机名称模糊"
// @Param    customer_id query  int     false  "客户ID过滤"
// @Param    stage       query  string  false  "阶段过滤"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/opportunities [get]
func (h *OpportunityHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	stage := c.Query("stage")
	customerID, _ := strconv.ParseUint(c.Query("customer_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, uint(customerID), stage)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Board 商机看板
// @Summary  商机看板(按阶段分组)
// @Tags     商机管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/opportunities/board [get]
func (h *OpportunityHandler) Board(c *gin.Context) {
	board, err := h.svc.Board(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, board)
}

// ChangeStage 商机阶段流转
// @Summary  商机阶段流转
// @Tags     商机管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "商机ID"
// @Param    body  body      object  true  "阶段流转请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/opportunities/{id}/stage [put]
func (h *OpportunityHandler) ChangeStage(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req struct {
		Stage  string `json:"stage" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.ChangeStage(c.Request.Context(), uint(id), req.Stage, middleware.GetUserID(c), req.Reason); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// StageHistory 商机阶段变更历史
// @Summary  商机阶段变更历史
// @Tags     商机管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "商机ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/opportunities/{id}/stage-history [get]
func (h *OpportunityHandler) StageHistory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.StageHistory(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
