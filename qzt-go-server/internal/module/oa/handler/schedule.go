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

type ScheduleHandler struct {
	svc *service.ScheduleService
}

func NewScheduleHandler() *ScheduleHandler { return &ScheduleHandler{svc: service.NewScheduleService()} }

// List 日程列表
// @Summary      日程列表
// @Tags         OA-日程
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码"
// @Param        page_size   query  int     false  "每页条数"
// @Param        title       query  string  false  "标题(模糊)"
// @Param        event_type  query  string  false  "类型"
// @Param        status      query  string  false  "状态"
// @Param        start_date  query  string  false  "开始日期"
// @Param        end_date    query  string  false  "结束日期"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/schedules [get]
func (h *ScheduleHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		middleware.GetUserID(c), c.Query("title"), c.Query("event_type"), c.Query("status"),
		c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Calendar 日历视图:返回当前用户指定日期范围内的全部日程
// @Summary      日程日历
// @Tags         OA-日程
// @Produce      json
// @Security     BearerAuth
// @Param        start_date  query  string  true  "开始日期"
// @Param        end_date    query  string  true  "结束日期"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/schedules/calendar [get]
func (h *ScheduleHandler) Calendar(c *gin.Context) {
	list, err := h.svc.ListByDateRange(c.Request.Context(), middleware.GetUserID(c),
		c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// GetByID 日程详情
// @Summary      日程详情
// @Tags         OA-日程
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "日程ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/schedules/{id} [get]
func (h *ScheduleHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	sch, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, sch)
}

// Create 新建日程
// @Summary      新建日程
// @Tags         OA-日程
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateScheduleRequest  true  "日程"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/schedules [post]
func (h *ScheduleHandler) Create(c *gin.Context) {
	var req service.CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	sch, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, sch)
}

// Update 编辑日程
// @Summary      编辑日程
// @Tags         OA-日程
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "日程ID"
// @Param        body  body  service.UpdateScheduleRequest  true  "日程"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/schedules/{id} [put]
func (h *ScheduleHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateScheduleRequest
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

// Delete 删除日程
// @Summary      删除日程
// @Tags         OA-日程
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "日程ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/schedules/{id} [delete]
func (h *ScheduleHandler) Delete(c *gin.Context) {
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
