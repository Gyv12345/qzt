package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/approval/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// FlowHandler 审批流程设计。
type FlowHandler struct {
	svc *service.FlowService
}

func NewFlowHandler() *FlowHandler { return &FlowHandler{svc: service.NewFlowService()} }

// List 流程列表
// @Summary      审批流程列表
// @Tags         审批流程
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10)"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/flows [get]
func (h *FlowHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByFormType 按表单类型查流程(不存在则自动创建预置)。
// @Summary      按表单类型获取审批流程
// @Tags         审批流程
// @Produce      json
// @Security     BearerAuth
// @Param        form_type  query  string  true   "表单类型(如 CONTRACT/EXPENSE/TRIP 等)"
// @Param        form_key   query  string  false  "表单标识(仅 OA_CUSTOM 按模板细分)"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/flows/by-type [get]
func (h *FlowHandler) GetByFormType(c *gin.Context) {
	formType := c.Query("form_type")
	if formType == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: form_type 不能为空")
		return
	}
	flow, err := h.svc.GetByFormType(c.Request.Context(), formType, c.Query("form_key"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, flow)
}

// GetByID 流程详情(含节点图)
// @Summary      审批流程详情
// @Tags         审批流程
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "流程ID"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/flows/{id} [get]
func (h *FlowHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	detail, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, detail)
}

// Create 创建流程
// @Summary      创建审批流程
// @Tags         审批流程
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateFlowRequest  true  "创建流程请求"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/flows [post]
func (h *FlowHandler) Create(c *gin.Context) {
	var req service.CreateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	flow, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, flow)
}

// SaveDesign 保存流程设计(节点图)
// @Summary      保存流程设计
// @Description  保存审批节点图(节点/审批人/条件/连线),每次保存创建新版本
// @Tags         审批流程
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                      true  "流程ID"
// @Param        body  body      service.SaveDesignRequest  true  "节点图设计"
// @Success      200   {object}  xresponse.Response
// @Router       /approval/flows/{id}/design [put]
func (h *FlowHandler) SaveDesign(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SaveDesignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SaveDesign(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Enable 启用/禁用流程
// @Summary      启用/禁用流程
// @Tags         审批流程
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id      path   int  true  "流程ID"
// @Param        body    body   object  true  "启用状态"  example({"enable":1})
// @Success      200  {object}  xresponse.Response
// @Router       /approval/flows/{id}/enable [put]
func (h *FlowHandler) Enable(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var body struct {
		Enable int8 `json:"enable"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Enable(c.Request.Context(), uint(id), body.Enable); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
