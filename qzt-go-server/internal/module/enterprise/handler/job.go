package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// JobHandler 定时任务管理。
type JobHandler struct {
	svc *service.JobService
}

func NewJobHandler() *JobHandler { return &JobHandler{svc: service.NewJobService()} }

// List 定时任务列表
// @Summary      定时任务列表
// @Tags         定时任务
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/jobs [get]
func (h *JobHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 任务详情
// @Summary      任务详情
// @Tags         定时任务
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "任务ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/jobs/{id} [get]
func (h *JobHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	job, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, job)
}

// Create 创建任务
// @Summary      创建定时任务
// @Tags         定时任务
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateSysJobRequest  true  "创建任务请求"
// @Success      200   {object}  xresponse.Response
// @Router       /enterprise/jobs [post]
func (h *JobHandler) Create(c *gin.Context) {
	var req service.CreateSysJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	job, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, job)
}

// Update 更新任务
// @Summary      更新定时任务
// @Tags         定时任务
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                       true  "任务ID"
// @Param        body  body      service.UpdateSysJobRequest  true  "更新任务请求"
// @Success      200   {object}  xresponse.Response
// @Router       /enterprise/jobs/{id} [put]
func (h *JobHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateSysJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除任务
// @Summary      删除定时任务
// @Tags         定时任务
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "任务ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/jobs/{id} [delete]
func (h *JobHandler) Delete(c *gin.Context) {
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

// RunOnce 手动触发任务
// @Summary      手动触发任务
// @Description  立即执行一次指定任务(异步,不等待结果)
// @Tags         定时任务
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "任务ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/jobs/{id}/run [post]
func (h *JobHandler) RunOnce(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.RunOnce(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "任务已触发"})
}

// ListLogs 任务执行日志
// @Summary      任务执行日志
// @Tags         定时任务
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Param        job_id     query  int  false  "任务ID(可选过滤)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/job-logs [get]
func (h *JobHandler) ListLogs(c *gin.Context) {
	p := syservice.GetPagination(c)
	jobID, _ := strconv.ParseUint(c.Query("job_id"), 10, 64)
	list, total, err := h.svc.ListLogs(c.Request.Context(), p.Page, p.PageSize, uint(jobID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
