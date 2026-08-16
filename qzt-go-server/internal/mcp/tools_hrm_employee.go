package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_employee.go HRM 员工档案写 tools。

func registerHrmEmployeeTools(s *server.MCPServer) {
	// ── 员工 ──
	s.AddTool(
		mcp.NewTool("hrm_employee_create",
			mcp.WithDescription("创建员工档案(自动写一条入职履历)"),
			mcp.WithString("emp_no", mcp.Required(), mcp.Description("员工工号(唯一)")),
			mcp.WithString("name", mcp.Required(), mcp.Description("姓名")),
			mcp.WithNumber("department_id", mcp.Required(), mcp.Description("部门ID")),
			mcp.WithNumber("position_id", mcp.Required(), mcp.Description("岗位ID")),
			mcp.WithNumber("gender", mcp.Description("性别:0未知 1男 2女")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithNumber("user_id", mcp.Description("关联系统用户ID")),
			mcp.WithString("entry_date", mcp.Description("入职日期(YYYY-MM-DD)")),
			mcp.WithNumber("status", mcp.Description("状态:1在职 2试用(默认) 3离职")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmEmployeeCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_employee_update",
			mcp.WithDescription("更新员工信息(只传要修改的字段;修改部门/岗位/状态会自动写履历)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("emp_no", mcp.Description("员工工号(唯一)")),
			mcp.WithString("name", mcp.Description("姓名")),
			mcp.WithNumber("department_id", mcp.Description("部门ID")),
			mcp.WithNumber("position_id", mcp.Description("岗位ID")),
			mcp.WithNumber("gender", mcp.Description("性别:0未知 1男 2女")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithNumber("user_id", mcp.Description("关联系统用户ID")),
			mcp.WithString("entry_date", mcp.Description("入职日期(YYYY-MM-DD)")),
			mcp.WithString("resign_date", mcp.Description("离职日期(YYYY-MM-DD)")),
			mcp.WithNumber("status", mcp.Description("状态:1在职 2试用 3离职")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmEmployeeUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_employee_delete",
			mcp.WithDescription("删除员工(硬删除员工档案+履历,不可恢复)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("员工ID")),
		),
		handleHrmEmployeeDelete,
	)
}

// ── 员工 handlers ──

func handleHrmEmployeeCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	empNo := req.GetString("emp_no", "")
	name := req.GetString("name", "")
	deptID := uint(req.GetFloat("department_id", 0))
	posID := uint(req.GetFloat("position_id", 0))
	if empNo == "" || name == "" || deptID == 0 || posID == 0 {
		return resultError("工号(emp_no)、姓名(name)、部门ID(department_id)、岗位ID(position_id)必填")
	}
	createReq := &hrmsvc.CreateEmployeeRequest{
		EmpNo:        empNo,
		Name:         name,
		Gender:       int8(req.GetFloat("gender", 0)),
		Phone:        req.GetString("phone", ""),
		Email:        req.GetString("email", ""),
		DepartmentID: deptID,
		PositionID:   posID,
		UserID:       optUintPtr(req, "user_id"),
		EntryDate:    req.GetString("entry_date", ""),
		Status:       int8(req.GetFloat("status", 0)),
		Remark:       req.GetString("remark", ""),
	}
	emp, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建员工失败: %v", err))
	}
	return resultText(emp)
}

func handleHrmEmployeeUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("员工ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("员工不存在: %v", err))
	}
	empNo := req.GetString("emp_no", existing.EmpNo)
	name := req.GetString("name", existing.Name)
	deptID := uint(halfFloat(req, "department_id", float64(existing.DepartmentID)))
	posID := uint(halfFloat(req, "position_id", float64(existing.PositionID)))
	if empNo == "" || name == "" || deptID == 0 || posID == 0 {
		return resultError("工号(emp_no)、姓名(name)、部门ID(department_id)、岗位ID(position_id)不能为空")
	}
	// entry_date/resign_date:未传(空串)则 service 自动保留原值
	updateReq := &hrmsvc.UpdateEmployeeRequest{
		EmpNo:        empNo,
		Name:         name,
		Gender:       int8(halfFloat(req, "gender", float64(existing.Gender))),
		Phone:        halfString(req, "phone", existing.Phone),
		Email:        halfString(req, "email", existing.Email),
		DepartmentID: deptID,
		PositionID:   posID,
		UserID:       halfUintPtr(req, "user_id", existing.UserID),
		EntryDate:    req.GetString("entry_date", ""),
		ResignDate:   req.GetString("resign_date", ""),
		Status:       int8(halfFloat(req, "status", float64(existing.Status))),
		Remark:       halfString(req, "remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, updateReq, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新员工失败: %v", err))
	}
	return resultText(map[string]any{"message": "员工已更新", "id": id})
}

func handleHrmEmployeeDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("员工ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除员工失败: %v", err))
	}
	return resultText(map[string]any{"message": "员工已删除(硬删除,含履历)", "id": id})
}
