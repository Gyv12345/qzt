package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm.go HRM 只读 tools(部门/员工/职位/考勤/薪资)。

func registerHrmTools(s *server.MCPServer) {
	// ── 部门 ──
	s.AddTool(
		mcp.NewTool("hrm_department_list",
			mcp.WithDescription("查询部门列表"),
			mcp.WithString("keyword", mcp.Description("部门名称关键词")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 2停用(不传查全部)")),
		),
		handleHrmDepartmentList,
	)

	s.AddTool(
		mcp.NewTool("hrm_department_tree",
			mcp.WithDescription("查询部门树(含层级结构)"),
		),
		handleHrmDepartmentTree,
	)

	// ── 员工 ──
	s.AddTool(
		mcp.NewTool("hrm_employee_list",
			mcp.WithDescription("查询员工列表(支持分页/关键词/部门/职位/状态筛选)"),
			mcp.WithString("keyword", mcp.Description("姓名/工号关键词")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithNumber("position_id", mcp.Description("职位ID")),
			mcp.WithNumber("status", mcp.Description("状态:1在职 2试用 3离职(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleHrmEmployeeList,
	)

	s.AddTool(
		mcp.NewTool("hrm_employee_get",
			mcp.WithDescription("查询员工详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("员工ID")),
		),
		handleHrmEmployeeGet,
	)

	// ── 职位 ──
	s.AddTool(
		mcp.NewTool("hrm_position_list",
			mcp.WithDescription("查询职位列表"),
			mcp.WithNumber("dept_id", mcp.Description("部门ID(不传查全部)")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 2停用(不传查全部)")),
		),
		handleHrmPositionList,
	)

	// ── 考勤 ──
	s.AddTool(
		mcp.NewTool("hrm_attendance_clock_list",
			mcp.WithDescription("查询员工打卡记录"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
		),
		handleHrmClockList,
	)

	s.AddTool(
		mcp.NewTool("hrm_attendance_summary",
			mcp.WithDescription("查询考勤月度汇总(出勤/迟到/缺卡等)"),
			mcp.WithString("year_month", mcp.Description("月份(YYYY-MM,不传查全部)")),
			mcp.WithNumber("department_id", mcp.Description("部门ID(不传查全部)")),
		),
		handleHrmAttendanceSummary,
	)

	// ── 薪资 ──
	s.AddTool(
		mcp.NewTool("hrm_payroll_list",
			mcp.WithDescription("查询薪资单列表"),
			mcp.WithString("year_month", mcp.Description("月份(YYYY-MM,不传查全部)")),
			mcp.WithNumber("department_id", mcp.Description("部门ID(不传查全部)")),
		),
		handleHrmPayrollList,
	)
}

// ── handlers ──

func handleHrmDepartmentList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	list, err := svc.List(ctx, req.GetString("keyword", ""), int8(req.GetFloat("status", 0)))
	if err != nil {
		return resultError(fmt.Sprintf("查询部门列表失败: %v", err))
	}
	return resultText(list)
}

func handleHrmDepartmentTree(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	tree, err := svc.Tree(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询部门树失败: %v", err))
	}
	return resultText(tree)
}

func handleHrmEmployeeList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		uint(req.GetFloat("dept_id", 0)),
		uint(req.GetFloat("position_id", 0)),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询员工列表失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleHrmEmployeeGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("员工ID(id)必填")
	}
	emp, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询员工失败: %v", err))
	}
	return resultText(emp)
}

func handleHrmPositionList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	list, err := svc.List(ctx, uint(req.GetFloat("dept_id", 0)), int8(req.GetFloat("status", 0)))
	if err != nil {
		return resultError(fmt.Sprintf("查询职位列表失败: %v", err))
	}
	return resultText(list)
}

func handleHrmClockList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	if employeeID == 0 {
		return resultError("员工ID(employee_id)必填")
	}
	list, err := svc.ClockList(ctx, employeeID, 0, req.GetString("start_date", ""), req.GetString("end_date", ""))
	if err != nil {
		return resultError(fmt.Sprintf("查询打卡记录失败: %v", err))
	}
	return resultText(list)
}

func handleHrmAttendanceSummary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	list, err := svc.SummaryList(ctx, req.GetString("year_month", ""), uint(req.GetFloat("department_id", 0)))
	if err != nil {
		return resultError(fmt.Sprintf("查询考勤汇总失败: %v", err))
	}
	return resultText(list)
}

func handleHrmPayrollList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	list, err := svc.PayrollList(ctx, req.GetString("year_month", ""), uint(req.GetFloat("department_id", 0)))
	if err != nil {
		return resultError(fmt.Sprintf("查询薪资单失败: %v", err))
	}
	return resultText(list)
}
