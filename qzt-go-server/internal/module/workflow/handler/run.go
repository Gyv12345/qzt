// handler/run.go 自动化工作流执行记录 + 事件目录 handler(P27)。
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	wfsvc "qzt-go-server/internal/module/workflow/service"
	response "qzt-go-server/pkg/xresponse"
)

// RunHandler 执行记录。
type RunHandler struct {
	svc *wfsvc.RunService
}

func NewRunHandler() *RunHandler {
	return &RunHandler{svc: wfsvc.NewRunService()}
}

// ListRuns 执行记录列表
// @Summary  执行记录列表
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/runs [get]
func (h *RunHandler) ListRuns(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	defID, _ := strconv.ParseUint(c.Query("definition_id"), 10, 64)
	list, total, err := h.svc.ListRuns(c.Request.Context(), page, pageSize, uint(defID), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetRun 执行详情
// @Summary  执行详情
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/runs/:id [get]
func (h *RunHandler) GetRun(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	run, err := h.svc.GetRun(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, run)
}

// RetryRun 重跑执行
// @Summary  重跑执行
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/runs/:id/retry [post]
func (h *RunHandler) RetryRun(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	run, err := h.svc.RetryRun(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, run)
}

// DeleteRun 删除执行记录
// @Summary  删除执行记录
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/runs/:id [delete]
func (h *RunHandler) DeleteRun(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.DeleteRun(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Events 事件目录
// @Summary  事件目录
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/events [get]
func (h *RunHandler) Events(c *gin.Context) {
	response.OK(c, gin.H{
		"events": wfsvc.EventCatalog,
		"actions": wfsvc.ActionCatalog,
	})
}