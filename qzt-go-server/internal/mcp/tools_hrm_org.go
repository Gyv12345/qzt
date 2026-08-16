package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_org.go HRM 组织架构写 tools(部门 + 岗位)。

func registerHrmDepartmentTools(s *server.MCPServer) {
	// ── 部门 ──
	s.AddTool(
		mcp.NewTool("hrm_department_create",
			mcp.WithDescription("创建部门"),
			mcp.WithString("name", mcp.Required(), mcp.Description("部门名称")),
			mcp.WithString("code", mcp.Required(), mcp.Description("部门编码(唯一)")),
			mcp.WithNumber("parent_id", mcp.Description("父部门ID(顶级填0或不传)")),
			mcp.WithNumber("leader_id", mcp.Description("负责人ID(关联系统用户)")),
			mcp.WithNumber("sort", mcp.Description("排序值(默认0)")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用(默认1)")),
		),
		handleHrmDepartmentCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_department_update",
			mcp.WithDescription("更新部门信息(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("部门ID")),
			mcp.WithString("name", mcp.Description("部门名称")),
			mcp.WithString("code", mcp.Description("部门编码(唯一)")),
			mcp.WithNumber("parent_id", mcp.Description("父部门ID(顶级填0)")),
			mcp.WithNumber("leader_id", mcp.Description("负责人ID(传0清除)")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
		),
		handleHrmDepartmentUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_department_delete",
			mcp.WithDescription("删除部门(有子部门或员工则拒绝)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("部门ID")),
		),
		handleHrmDepartmentDelete,
	)
}

func registerHrmPositionTools(s *server.MCPServer) {
	// ── 岗位 ──
	s.AddTool(
		mcp.NewTool("hrm_position_create",
			mcp.WithDescription("创建岗位"),
			mcp.WithString("name", mcp.Required(), mcp.Description("岗位名称")),
			mcp.WithString("code", mcp.Required(), mcp.Description("岗位编码(唯一)")),
			mcp.WithNumber("department_id", mcp.Required(), mcp.Description("所属部门ID")),
			mcp.WithNumber("sort", mcp.Description("排序值(默认0)")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用(默认1)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmPositionCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_position_update",
			mcp.WithDescription("更新岗位信息(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("岗位ID")),
			mcp.WithString("name", mcp.Description("岗位名称")),
			mcp.WithString("code", mcp.Description("岗位编码(唯一)")),
			mcp.WithNumber("department_id", mcp.Description("所属部门ID")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmPositionUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_position_delete",
			mcp.WithDescription("删除岗位(有员工则拒绝)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("岗位ID")),
		),
		handleHrmPositionDelete,
	)
}

// ── 部门 handlers ──

func handleHrmDepartmentCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	if name == "" || code == "" {
		return resultError("部门名称(name)和编码(code)必填")
	}
	createReq := &hrmsvc.CreateDepartmentRequest{
		ParentID: uint(req.GetFloat("parent_id", 0)),
		Name:     name,
		Code:     code,
		Leader:   optUintPtr(req, "leader_id"),
		Sort:     int(req.GetFloat("sort", 0)),
		Status:   int8(req.GetFloat("status", 0)),
	}
	dept, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建部门失败: %v", err))
	}
	return resultText(dept)
}

func handleHrmDepartmentUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("部门ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("部门不存在: %v", err))
	}
	name := req.GetString("name", existing.Name)
	code := req.GetString("code", existing.Code)
	if name == "" || code == "" {
		return resultError("部门名称(name)和编码(code)不能为空")
	}
	updateReq := &hrmsvc.UpdateDepartmentRequest{
		ParentID: halfUintPtr(req, "parent_id", &existing.ParentID),
		Name:     name,
		Code:     code,
		Leader:   halfUintPtr(req, "leader_id", existing.Leader),
		Sort:     halfInt(req, "sort", existing.Sort),
		Status:   int8(halfFloat(req, "status", float64(existing.Status))),
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新部门失败: %v", err))
	}
	return resultText(map[string]any{"message": "部门已更新", "id": id})
}

func handleHrmDepartmentDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("部门ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除部门失败: %v", err))
	}
	return resultText(map[string]any{"message": "部门已删除", "id": id})
}

// ── 岗位 handlers ──

func handleHrmPositionCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	deptID := uint(req.GetFloat("department_id", 0))
	if name == "" || code == "" || deptID == 0 {
		return resultError("岗位名称(name)、编码(code)和部门ID(department_id)必填")
	}
	createReq := &hrmsvc.CreatePositionRequest{
		Name:         name,
		Code:         code,
		DepartmentID: deptID,
		Sort:         int(req.GetFloat("sort", 0)),
		Status:       int8(req.GetFloat("status", 0)),
		Remark:       req.GetString("remark", ""),
	}
	pos, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建岗位失败: %v", err))
	}
	return resultText(pos)
}

func handleHrmPositionUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("岗位ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("岗位不存在: %v", err))
	}
	name := req.GetString("name", existing.Name)
	code := req.GetString("code", existing.Code)
	deptID := uint(halfFloat(req, "department_id", float64(existing.DepartmentID)))
	if name == "" || code == "" || deptID == 0 {
		return resultError("岗位名称(name)、编码(code)和部门ID(department_id)不能为空")
	}
	updateReq := &hrmsvc.UpdatePositionRequest{
		Name:         name,
		Code:         code,
		DepartmentID: deptID,
		Sort:         halfInt(req, "sort", existing.Sort),
		Status:       int8(halfFloat(req, "status", float64(existing.Status))),
		Remark:       halfString(req, "remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新岗位失败: %v", err))
	}
	return resultText(map[string]any{"message": "岗位已更新", "id": id})
}

func handleHrmPositionDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("岗位ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除岗位失败: %v", err))
	}
	return resultText(map[string]any{"message": "岗位已删除", "id": id})
}
