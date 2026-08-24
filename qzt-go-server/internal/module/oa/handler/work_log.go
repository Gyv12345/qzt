package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type WorkLogHandler struct {
	svc *service.WorkLogService
}

func NewWorkLogHandler() *WorkLogHandler { return &WorkLogHandler{svc: service.NewWorkLogService()} }

// List 工作日志列表
// @Summary      工作日志列表
// @Tags         OA-工作日志
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码"
// @Param        page_size   query  int     false  "每页条数"
// @Param        log_type    query  string  false  "类型(DAILY/WEEKLY/MONTHLY)"
// @Param        log_date    query  string  false  "日志日期(YYYY-MM-DD)"
// @Param        start_date  query  string  false  "开始日期"
// @Param        end_date    query  string  false  "结束日期"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/work-logs [get]
func (h *WorkLogHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("log_type"), c.Query("log_date"), c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 工作日志详情
// @Summary      工作日志详情
// @Tags         OA-工作日志
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "日志ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/work-logs/{id} [get]
func (h *WorkLogHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	log, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, log)
}

// Create 新建工作日志
// @Summary      新建工作日志
// @Tags         OA-工作日志
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateWorkLogRequest  true  "工作日志"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/work-logs [post]
func (h *WorkLogHandler) Create(c *gin.Context) {
	var req service.CreateWorkLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	log, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, log)
}

// Update 编辑工作日志
// @Summary      编辑工作日志
// @Tags         OA-工作日志
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "日志ID"
// @Param        body  body  service.UpdateWorkLogRequest  true  "工作日志"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/work-logs/{id} [put]
func (h *WorkLogHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateWorkLogRequest
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

// Delete 删除工作日志
// @Summary      删除工作日志
// @Tags         OA-工作日志
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "日志ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/work-logs/{id} [delete]
func (h *WorkLogHandler) Delete(c *gin.Context) {
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
