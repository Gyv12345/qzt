package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/deploy/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// runStaticRequest POST /deploy/static 请求体。
type runStaticRequest struct {
	// 目标站点:cms=官网+跨境双主题(单构建双主题发布,服务端白名单校验)
	Target string `json:"target" binding:"required" example:"cms"`
}

// DeployHandler 静态站一键发布 handler(仅超管可用,未绑菜单)。
type DeployHandler struct {
	svc *service.Runner
}

// NewDeployHandler 构造。
func NewDeployHandler() *DeployHandler {
	return &DeployHandler{svc: service.GetRunner()}
}

// RunStatic 一键重新生成并发布静态站
// @Summary     一键重新生成并发布静态站
// @Description 服务器端异步执行 rebuild_static.sh(npm install + next build + rsync 发布),同一时刻仅允许一个任务,进行中重复触发直接拒绝;进度与日志尾通过 GET /deploy/status 轮询。超管专用(Casbin 超管内存短路,未绑菜单/按钮)。
// @Tags        静态站发布
// @Accept      json
// @Produce     json
// @Param       body body runStaticRequest true "目标(cms=官网+跨境双主题)"
// @Security    BearerAuth
// @Success     200 {object} xresponse.Response
// @Router      /deploy/static [post]
func (h *DeployHandler) RunStatic(c *gin.Context) {
	var req runStaticRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	if err := h.svc.Run(req.Target); err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Status 静态站重建状态查询
// @Summary     静态站重建状态查询
// @Description 返回当前是否有任务在执行,以及各目标(当前仅 cms=官网+跨境双主题)最近一次重建的状态与日志尾(末 30 行)。
// @Tags        静态站发布
// @Produce     json
// @Security    BearerAuth
// @Success     200 {object} xresponse.Response{data=service.StatusResponse}
// @Router      /deploy/status [get]
func (h *DeployHandler) Status(c *gin.Context) {
	response.OK(c, h.svc.Status())
}
