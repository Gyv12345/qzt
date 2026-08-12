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

// AttendanceHandler 考勤管理(打卡/请假/加班/月度汇总)。
type AttendanceHandler struct {
	svc *service.AttendanceService
}

func NewAttendanceHandler() *AttendanceHandler {
	return &AttendanceHandler{svc: service.NewAttendanceService()}
}

// ── 打卡 ──

// ClockIn 打卡
// @Summary      考勤打卡
// @Description  上班/下班打卡(同日同类型重复打卡则更新)
// @Tags         考勤管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.ClockInRequest  true  "打卡请求"
// @Success      200   {object}  xresponse.Response
// @Router       /hrm/attendance/clock [post]
func (h *AttendanceHandler) ClockIn(c *gin.Context) {
	var req service.ClockInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	result, err := h.svc.ClockIn(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// ClockList 打卡记录
// @Summary      打卡记录
// @Tags         考勤管理
// @Produce      json
// @Security     BearerAuth
// @Param        employee_id  query  int     false  "员工ID(不传则取当前登录用户)"
// @Param        start_date   query  string  false  "开始日期(yyyy-MM-dd)"
// @Param        end_date     query  string  false  "结束日期(yyyy-MM-dd)"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/clocks [get]
func (h *AttendanceHandler) ClockList(c *gin.Context) {
	empID, _ := strconv.ParseUint(c.Query("employee_id"), 10, 64)
	list, err := h.svc.ClockList(c.Request.Context(), uint(empID), middleware.GetUserID(c), c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 请假 ──

// ApplyLeave 申请请假
// @Summary      申请请假
// @Tags         考勤管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.LeaveRequest  true  "请假请求"
// @Success      200   {object}  xresponse.Response
// @Router       /hrm/attendance/leaves [post]
func (h *AttendanceHandler) ApplyLeave(c *gin.Context) {
	var req service.LeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	leave, err := h.svc.ApplyLeave(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, leave)
}

// ApproveLeave 审批请假
// @Summary      审批请假
// @Tags         考勤管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path   int  true  "请假单ID"
// @Param        body  body   object  true  "审批"  example({"approved":true,"remark":"同意"})
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/leaves/{id}/approve [put]
func (h *AttendanceHandler) ApproveLeave(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Approved bool   `json:"approved"`
		Remark   string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.ApproveLeave(c.Request.Context(), uint(id), userID, body.Approved, body.Remark); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// LeaveList 请假单列表
// @Summary      请假单列表
// @Tags         考勤管理
// @Produce      json
// @Security     BearerAuth
// @Param        page         query  int     false  "页码"
// @Param        page_size    query  int     false  "每页条数"
// @Param        employee_id  query  int     false  "员工ID(可选)"
// @Param        status       query  string  false  "状态(PENDING/APPROVED/REJECTED)"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/leaves [get]
func (h *AttendanceHandler) LeaveList(c *gin.Context) {
	p := syservice.GetPagination(c)
	empID, _ := strconv.ParseUint(c.Query("employee_id"), 10, 64)
	list, total, err := h.svc.LeaveList(c.Request.Context(), p.Page, p.PageSize, uint(empID), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ── 加班 ──

// ApplyOvertime 申请加班
// @Summary      申请加班
// @Tags         考勤管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.OvertimeRequest  true  "加班请求"
// @Success      200   {object}  xresponse.Response
// @Router       /hrm/attendance/overtimes [post]
func (h *AttendanceHandler) ApplyOvertime(c *gin.Context) {
	var req service.OvertimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	ot, err := h.svc.ApplyOvertime(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, ot)
}

// ApproveOvertime 审批加班
// @Summary      审批加班
// @Tags         考勤管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path   int  true  "加班单ID"
// @Param        body  body   object  true  "审批"  example({"approved":true,"remark":"同意"})
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/overtimes/{id}/approve [put]
func (h *AttendanceHandler) ApproveOvertime(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body struct {
		Approved bool   `json:"approved"`
		Remark   string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.ApproveOvertime(c.Request.Context(), uint(id), userID, body.Approved, body.Remark); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// OvertimeList 加班单列表
// @Summary      加班单列表
// @Tags         考勤管理
// @Produce      json
// @Security     BearerAuth
// @Param        page         query  int     false  "页码"
// @Param        page_size    query  int     false  "每页条数"
// @Param        employee_id  query  int     false  "员工ID"
// @Param        status       query  string  false  "状态"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/overtimes [get]
func (h *AttendanceHandler) OvertimeList(c *gin.Context) {
	p := syservice.GetPagination(c)
	empID, _ := strconv.ParseUint(c.Query("employee_id"), 10, 64)
	list, total, err := h.svc.OvertimeList(c.Request.Context(), p.Page, p.PageSize, uint(empID), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ── 月度汇总 ──

// GenerateSummary 生成月度考勤汇总
// @Summary      生成月度考勤汇总
// @Description  按员工+年月统计出勤/请假/加班
// @Tags         考勤管理
// @Produce      json
// @Security     BearerAuth
// @Param        employee_id  query  int     true   "员工ID"
// @Param        year_month   query  string  true   "年月(yyyy-MM)"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/summary/generate [post]
func (h *AttendanceHandler) GenerateSummary(c *gin.Context) {
	empID, _ := strconv.ParseUint(c.Query("employee_id"), 10, 64)
	yearMonth := c.Query("year_month")
	if empID == 0 || yearMonth == "" {
		response.Fail(c, errcode.ErrParam, "employee_id 和 year_month 必填")
		return
	}
	summary, err := h.svc.GenerateSummary(c.Request.Context(), uint(empID), yearMonth)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, summary)
}

// SummaryList 月度汇总列表
// @Summary      月度考勤汇总列表
// @Tags         考勤管理
// @Produce      json
// @Security     BearerAuth
// @Param        year_month     query  string  false  "年月(yyyy-MM)"
// @Param        department_id  query  int     false  "部门ID"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/attendance/summary [get]
func (h *AttendanceHandler) SummaryList(c *gin.Context) {
	deptID, _ := strconv.ParseUint(c.Query("department_id"), 10, 64)
	list, err := h.svc.SummaryList(c.Request.Context(), c.Query("year_month"), uint(deptID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
