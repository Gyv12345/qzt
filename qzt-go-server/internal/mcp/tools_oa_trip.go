package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_trip.go OA 出差申请 tools。

func registerOaTripTools(s *server.MCPServer) {
	// ── 出差 trip (5) ──
	s.AddTool(
		mcp.NewTool("oa_trip_list",
			mcp.WithDescription("查询出差申请列表"),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaTripList,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_get",
			mcp.WithDescription("查询出差申请详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("出差单ID")),
		),
		handleOaTripGet,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_create",
			mcp.WithDescription("创建出差申请"),
			mcp.WithString("title", mcp.Required(), mcp.Description("出差标题")),
			mcp.WithString("destination", mcp.Required(), mcp.Description("目的地")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("出发日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("返回日期(YYYY-MM-DD)")),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID(默认当前用户)")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("purpose", mcp.Description("出差目的")),
			mcp.WithString("transport", mcp.Description("交通方式")),
			mcp.WithString("budget_amount", mcp.Description("预算金额(decimal 字符串)")),
			mcp.WithString("description", mcp.Description("备注说明")),
		),
		handleOaTripCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_update",
			mcp.WithDescription("更新出差申请(仅未提交/已驳回可改;只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("出差单ID")),
			mcp.WithString("title", mcp.Description("出差标题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("destination", mcp.Description("目的地")),
			mcp.WithString("purpose", mcp.Description("出差目的")),
			mcp.WithString("start_date", mcp.Description("出发日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("返回日期(YYYY-MM-DD)")),
			mcp.WithString("transport", mcp.Description("交通方式")),
			mcp.WithString("budget_amount", mcp.Description("预算金额(decimal 字符串)")),
			mcp.WithString("description", mcp.Description("备注说明")),
		),
		handleOaTripUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_delete",
			mcp.WithDescription("删除出差申请(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("出差单ID")),
		),
		handleOaTripDelete,
	)
}

// ── 出差 handlers ──

func handleOaTripList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("applicant_id", 0)),
		req.GetString("trip_no", ""),
		req.GetString("title", ""),
		req.GetString("destination", ""),
		req.GetString("approval_status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询出差列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaTripGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("出差单ID(id)必填")
	}
	trip, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询出差单失败: %v", err))
	}
	return resultText(trip)
}

func handleOaTripCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	title := req.GetString("title", "")
	destination := req.GetString("destination", "")
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if title == "" || destination == "" || startDate == "" || endDate == "" {
		return resultError("标题(title)、目的地(destination)、出发日期(start_date)、返回日期(end_date)必填")
	}
	createReq := &oasvc.CreateTripRequest{
		Title:        title,
		ApplicantID:  uint(req.GetFloat("applicant_id", 0)),
		DeptID:       optUintPtr(req, "dept_id"),
		Destination:  destination,
		Purpose:      req.GetString("purpose", ""),
		StartDate:    startDate,
		EndDate:      endDate,
		Transport:    req.GetString("transport", ""),
		BudgetAmount: req.GetString("budget_amount", ""),
		Description:  req.GetString("description", ""),
	}
	trip, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建出差单失败: %v", err))
	}
	return resultText(trip)
}

func handleOaTripUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("出差单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("出差单不存在: %v", err))
	}
	// start_date/end_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateTripRequest{
		Title:        req.GetString("title", existing.Title),
		DeptID:       halfUintPtr(req, "dept_id", existing.DeptID),
		Destination:  req.GetString("destination", existing.Destination),
		Purpose:      req.GetString("purpose", existing.Purpose),
		StartDate:    req.GetString("start_date", ""),
		EndDate:      req.GetString("end_date", ""),
		Transport:    req.GetString("transport", existing.Transport),
		BudgetAmount: req.GetString("budget_amount", existing.BudgetAmount),
		Description:  req.GetString("description", existing.Description),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新出差单失败: %v", err))
	}
	return resultText(map[string]any{"message": "出差单已更新", "id": id})
}

func handleOaTripDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("出差单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除出差单失败: %v", err))
	}
	return resultText(map[string]any{"message": "出差单已删除", "id": id})
}
