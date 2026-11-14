package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/hrm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// schedule.go 排班 v2 handler:班次/节假日/考勤组/排班。

// ScheduleHandler 排班管理。
type ScheduleHandler struct {
	svc *service.ScheduleService
}

func NewScheduleHandler() *ScheduleHandler {
	return &ScheduleHandler{svc: service.NewScheduleService()}
}

// ── 班次 ──

// ListShifts 班次列表
// @Summary  班次列表
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int  false  "页码"
// @Param    page_size  query  int  false  "每页条数"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/shifts [get]
func (h *ScheduleHandler) ListShifts(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListShifts(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateShift 新建班次
// @Summary  新建班次
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.ShiftRequest  true  "班次请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/shifts [post]
func (h *ScheduleHandler) CreateShift(c *gin.Context) {
	var req service.ShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.CreateShift(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// UpdateShift 更新班次
// @Summary  更新班次
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "班次ID"
// @Param    body  body  service.ShiftRequest  true  "班次请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/shifts/{id} [put]
func (h *ScheduleHandler) UpdateShift(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.ShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateShift(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteShift 删除班次
// @Summary  删除班次
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "班次ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/shifts/{id} [delete]
func (h *ScheduleHandler) DeleteShift(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteShift(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 节假日 ──

// MySchedule 我的排班(移动端)
// @Summary  我的排班月视图
// @Description  按登录用户反查员工档案,返回本人当月排班(班次+假日标注);仅登录不走 RBAC
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    month  query  string  true  "月份(yyyy-MM)"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/schedules/my [get]
func (h *ScheduleHandler) MySchedule(c *gin.Context) {
	month := c.Query("month")
	if month == "" {
		response.Fail(c, errcode.ErrParam, "month 必填(yyyy-MM)")
		return
	}
	userID := middleware.GetUserID(c)
	list, err := h.svc.MySchedule(c.Request.Context(), userID, month)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// ListHolidays 节假日列表
// @Summary  节假日列表
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int     false  "页码"
// @Param    page_size  query  int     false  "每页条数"
// @Param    year       query  string  false  "年份(如 2026)"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/holidays [get]
func (h *ScheduleHandler) ListHolidays(c *gin.Context) {
	p := syservice.GetPagination(c)
	year := c.Query("year")
	list, total, err := h.svc.ListHolidays(c.Request.Context(), p.Page, p.PageSize, year)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateHoliday 新建节假日
// @Summary  新建节假日
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.HolidayRequest  true  "节假日请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/holidays [post]
func (h *ScheduleHandler) CreateHoliday(c *gin.Context) {
	var req service.HolidayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.CreateHoliday(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// UpdateHoliday 更新节假日
// @Summary  更新节假日
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "节假日ID"
// @Param    body  body  service.HolidayRequest  true  "节假日请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/holidays/{id} [put]
func (h *ScheduleHandler) UpdateHoliday(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.HolidayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateHoliday(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteHoliday 删除节假日
// @Summary  删除节假日
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "节假日ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/holidays/{id} [delete]
func (h *ScheduleHandler) DeleteHoliday(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteHoliday(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 考勤组 ──

// ListGroups 考勤组列表
// @Summary  考勤组列表
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int  false  "页码"
// @Param    page_size  query  int  false  "每页条数"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/attendance-groups [get]
func (h *ScheduleHandler) ListGroups(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListGroups(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateGroup 新建考勤组
// @Summary  新建考勤组
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.AttendanceGroupRequest  true  "考勤组请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/attendance-groups [post]
func (h *ScheduleHandler) CreateGroup(c *gin.Context) {
	var req service.AttendanceGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.CreateGroup(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// UpdateGroup 更新考勤组
// @Summary  更新考勤组
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "考勤组ID"
// @Param    body  body  service.AttendanceGroupRequest  true  "考勤组请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/attendance-groups/{id} [put]
func (h *ScheduleHandler) UpdateGroup(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.AttendanceGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateGroup(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteGroup 删除考勤组
// @Summary  删除考勤组
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "考勤组ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/attendance-groups/{id} [delete]
func (h *ScheduleHandler) DeleteGroup(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteGroup(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 排班 ──

// MonthView 排班月视图
// @Summary  排班月视图
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    month  query  string  true  "月份(yyyy-MM)"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/schedules/month [get]
func (h *ScheduleHandler) MonthView(c *gin.Context) {
	month := c.Query("month")
	if month == "" {
		response.Fail(c, errcode.ErrParam, "month 必填(yyyy-MM)")
		return
	}
	list, err := h.svc.MonthView(c.Request.Context(), month)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// BatchSchedule 整月批量排班
// @Summary  整月批量排班(upsert)
// @Tags     人事-排班管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.ScheduleBatchRequest  true  "批量排班请求"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/schedules/batch [post]
func (h *ScheduleHandler) BatchSchedule(c *gin.Context) {
	var req service.ScheduleBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	n, err := h.svc.BatchSchedule(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"count": n})
}

// DeleteSchedule 删除排班
// @Summary  删除排班
// @Tags     人事-排班管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "排班ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/schedules/{id} [delete]
func (h *ScheduleHandler) DeleteSchedule(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteSchedule(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
