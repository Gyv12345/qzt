package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_attendance.go HRM 考勤写 tools(打卡/请假/加班/月度汇总)。

func registerHrmAttendanceTools(s *server.MCPServer) {
	// ── 考勤 ──
	s.AddTool(
		mcp.NewTool("hrm_attendance_clock",
			mcp.WithDescription("员工打卡(上班/下班,同一天同类型重复打卡则更新)。employee_id 不传则从登录用户推导"),
			mcp.WithString("clock_type", mcp.Required(), mcp.Description("打卡类型:CHECK_IN 上班 / CHECK_OUT 下班")),
			mcp.WithNumber("employee_id", mcp.Description("员工ID(不传则按当前登录用户推导)")),
			mcp.WithString("location", mcp.Description("打卡位置")),
			mcp.WithString("longitude", mcp.Description("经度")),
			mcp.WithString("latitude", mcp.Description("纬度")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmAttendanceClock,
	)
	s.AddTool(
		mcp.NewTool("hrm_leave_create",
			mcp.WithDescription("申请请假"),
			mcp.WithNumber("employee_id", mcp.Description("员工ID(不传则从当前登录用户推导)")),
			mcp.WithString("leave_type", mcp.Required(), mcp.Description("请假类型(字典 LEAVE_TYPE)")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("duration_days", mcp.Required(), mcp.Description("请假天数(数字字符串,如 1.5)")),
			mcp.WithString("leave_no", mcp.Description("请假单号(留空自动生成)")),
			mcp.WithString("reason", mcp.Description("请假原因")),
		),
		handleHrmLeaveCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_leave_approve",
			mcp.WithDescription("审批请假单(审批人为当前登录用户)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("请假单ID")),
			mcp.WithBoolean("approved", mcp.Required(), mcp.Description("是否通过:true 通过 / false 驳回")),
			mcp.WithString("remark", mcp.Description("审批备注")),
		),
		handleHrmLeaveApprove,
	)
	s.AddTool(
		mcp.NewTool("hrm_overtime_create",
			mcp.WithDescription("申请加班"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("duration_hours", mcp.Required(), mcp.Description("加班时长(小时,数字字符串)")),
			mcp.WithString("reason", mcp.Description("加班原因")),
			mcp.WithString("compensate_type", mcp.Description("补偿类型:PAY 加班费 / TO 调休(默认 PAY)")),
			mcp.WithString("overtime_no", mcp.Description("加班单号(留空自动生成)")),
		),
		handleHrmOvertimeCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_overtime_approve",
			mcp.WithDescription("审批加班单(审批人为当前登录用户)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("加班单ID")),
			mcp.WithBoolean("approved", mcp.Required(), mcp.Description("是否通过:true 通过 / false 驳回")),
			mcp.WithString("remark", mcp.Description("审批备注")),
		),
		handleHrmOvertimeApprove,
	)
	s.AddTool(
		mcp.NewTool("hrm_attendance_summary_generate",
			mcp.WithDescription("生成/刷新员工月度考勤汇总(按打卡/请假/加班统计)"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("year_month", mcp.Required(), mcp.Description("月份(YYYY-MM,如 2026-08)")),
		),
		handleHrmAttendanceSummaryGenerate,
	)
}

// ── 考勤 handlers ──

func handleHrmAttendanceClock(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	clockType := req.GetString("clock_type", "")
	if clockType != "CHECK_IN" && clockType != "CHECK_OUT" {
		return resultError("打卡类型(clock_type)必填,且只能是 CHECK_IN 或 CHECK_OUT")
	}
	clockReq := &hrmsvc.ClockInRequest{
		EmployeeID: uint(req.GetFloat("employee_id", 0)),
		ClockType:  clockType,
		Location:   req.GetString("location", ""),
		Longitude:  req.GetString("longitude", ""),
		Latitude:   req.GetString("latitude", ""),
		Remark:     req.GetString("remark", ""),
	}
	clock, err := svc.ClockIn(ctx, clockReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("打卡失败: %v", err))
	}
	return resultText(clock)
}

func handleHrmLeaveCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	leaveType := req.GetString("leave_type", "")
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	duration := req.GetString("duration_days", "")
	if leaveType == "" || startDate == "" || endDate == "" || duration == "" {
		return resultError("请假类型(leave_type)、开始时间(start_date)、结束时间(end_date)、天数(duration_days)必填")
	}
	leaveReq := &hrmsvc.LeaveRequest{
		LeaveNo:      req.GetString("leave_no", ""),
		EmployeeID:   employeeID,
		LeaveType:    leaveType,
		StartDate:    startDate,
		EndDate:      endDate,
		DurationDays: duration,
		Reason:       req.GetString("reason", ""),
	}
	leave, err := svc.ApplyLeave(ctx, leaveReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("请假申请失败: %v", err))
	}
	return resultText(leave)
}

func handleHrmLeaveApprove(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("请假单ID(id)必填")
	}
	approved := req.GetBool("approved", false)
	remark := req.GetString("remark", "")
	if err := svc.ApproveLeave(ctx, id, userIDFromContext(ctx), approved, remark); err != nil {
		return resultError(fmt.Sprintf("审批请假失败: %v", err))
	}
	return resultText(map[string]any{"message": "请假单已审批", "id": id, "approved": approved})
}

func handleHrmOvertimeCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	duration := req.GetString("duration_hours", "")
	if employeeID == 0 || startDate == "" || endDate == "" || duration == "" {
		return resultError("员工ID(employee_id)、开始时间(start_date)、结束时间(end_date)、时长(duration_hours)必填")
	}
	otReq := &hrmsvc.OvertimeRequest{
		OvertimeNo:     req.GetString("overtime_no", ""),
		EmployeeID:     employeeID,
		StartDate:      startDate,
		EndDate:        endDate,
		DurationHours:  duration,
		Reason:         req.GetString("reason", ""),
		CompensateType: req.GetString("compensate_type", ""),
	}
	ot, err := svc.ApplyOvertime(ctx, otReq)
	if err != nil {
		return resultError(fmt.Sprintf("加班申请失败: %v", err))
	}
	return resultText(ot)
}

func handleHrmOvertimeApprove(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("加班单ID(id)必填")
	}
	approved := req.GetBool("approved", false)
	remark := req.GetString("remark", "")
	if err := svc.ApproveOvertime(ctx, id, userIDFromContext(ctx), approved, remark); err != nil {
		return resultError(fmt.Sprintf("审批加班失败: %v", err))
	}
	return resultText(map[string]any{"message": "加班单已审批", "id": id, "approved": approved})
}

func handleHrmAttendanceSummaryGenerate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	yearMonth := req.GetString("year_month", "")
	if employeeID == 0 || yearMonth == "" {
		return resultError("员工ID(employee_id)和月份(year_month)必填")
	}
	summary, err := svc.GenerateSummary(ctx, employeeID, yearMonth)
	if err != nil {
		return resultError(fmt.Sprintf("生成考勤汇总失败: %v", err))
	}
	return resultText(summary)
}
