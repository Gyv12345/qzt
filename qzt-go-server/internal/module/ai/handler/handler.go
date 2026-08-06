package handler

// handler.go AI 模块的 HTTP handler。

import (
	"strconv"

	"github.com/gin-gonic/gin"

	response "qzt-go-server/pkg/xresponse"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/ai/service"
)

type Handler struct {
	agentSvc  *service.AgentService
	scriptSvc *service.ScriptService
	followSvc *service.FollowService
	reportSvc *service.ReportService
}

func NewHandler() *Handler {
	return &Handler{
		agentSvc:  service.NewAgentService(),
		scriptSvc: service.NewScriptService(),
		followSvc: service.NewFollowService(),
		reportSvc: service.NewReportService(),
	}
}

// ── Agent CRUD ──

func (h *Handler) ListAgents(c *gin.Context) {
	scene := c.Query("scene")
	list, err := h.agentSvc.List(c.Request.Context(), scene)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

func (h *Handler) CreateAgent(c *gin.Context) {
	var req service.CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	agent, err := h.agentSvc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, agent)
}

func (h *Handler) UpdateAgent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.agentSvc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

func (h *Handler) DeleteAgent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.agentSvc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── Agent 调用 ──

// GenerateScript 回访话术。
func (h *Handler) GenerateScript(c *gin.Context) {
	var req service.ScriptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	result, err := h.scriptSvc.Generate(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// GenerateFollow 跟进记录。
func (h *Handler) GenerateFollow(c *gin.Context) {
	var req service.FollowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	result, err := h.followSvc.Generate(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// GenerateReport 日报周报。
func (h *Handler) GenerateReport(c *gin.Context) {
	var req service.ReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	ownerID := middleware.GetUserID(c)
	result, err := h.reportSvc.Generate(c.Request.Context(), &req, ownerID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}
