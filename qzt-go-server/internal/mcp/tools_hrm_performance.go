package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_performance.go HRM 绩效考核 tools。

func registerHrmPerformanceTools(s *server.MCPServer) {
	// ── 绩效 ──
	s.AddTool(
		mcp.NewTool("hrm_performance_list",
			mcp.WithDescription("查询绩效考核列表"),
			mcp.WithString("keyword", mcp.Description("标题/员工姓名关键词")),
			mcp.WithString("period", mcp.Description("考核周期(如 2026-Q3)")),
			mcp.WithNumber("status", mcp.Description("状态:1进行中2自评完成3评审中4已完成")),
			mcp.WithNumber("employee_id", mcp.Description("员工ID")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleHrmPerformanceList,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_get",
			mcp.WithDescription("查询绩效考核详情(含考核指标明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
		),
		handleHrmPerformanceGet,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_create",
			mcp.WithDescription("创建绩效考核(含考核指标明细 items)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("考核标题")),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("考核开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("考核结束日期(YYYY-MM-DD)")),
			mcp.WithString("employee_name", mcp.Description("员工姓名")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("dept_name", mcp.Description("部门名称")),
			mcp.WithString("period", mcp.Description("考核周期(如 2026-Q3)")),
			mcp.WithNumber("reviewer_id", mcp.Description("评审人ID")),
			mcp.WithString("items", mcp.Description("考核指标明细(JSON数组),如 [{\"item_name\":\"业绩\",\"weight\":\"0.6\",\"target_desc\":\"完成100万\"}]")),
		),
		handleHrmPerformanceCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_self_review",
			mcp.WithDescription("提交绩效自评(仅进行中的考核可自评)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
			mcp.WithNumber("self_score", mcp.Description("自评分数")),
			mcp.WithString("self_comment", mcp.Description("自评评语")),
		),
		handleHrmPerformanceSelfReview,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_review",
			mcp.WithDescription("上级评审绩效(仅自评完成或评审中的考核可评审)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
			mcp.WithNumber("review_score", mcp.Description("评审分数")),
			mcp.WithString("review_comment", mcp.Description("评审评语")),
			mcp.WithNumber("final_score", mcp.Description("最终分数")),
			mcp.WithString("grade", mcp.Description("等级(如 A/B/C/D)")),
		),
		handleHrmPerformanceReview,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_delete",
			mcp.WithDescription("删除绩效考核(连同指标明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
		),
		handleHrmPerformanceDelete,
	)
}

// ── 绩效 handlers ──

func handleHrmPerformanceList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		req.GetString("perf_no", ""),
		req.GetString("title", ""),
		req.GetString("employee_name", ""),
		req.GetString("period", ""),
		int8(req.GetFloat("status", 0)),
		uint(req.GetFloat("employee_id", 0)),
		uint(req.GetFloat("dept_id", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询绩效列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleHrmPerformanceGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	p, items, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询绩效失败: %v", err))
	}
	return resultText(map[string]any{"performance": p, "items": items})
}

func handleHrmPerformanceCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	title := req.GetString("title", "")
	employeeID := uint(req.GetFloat("employee_id", 0))
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if title == "" || employeeID == 0 || startDate == "" || endDate == "" {
		return resultError("考核标题(title)、员工ID(employee_id)、开始日期(start_date)、结束日期(end_date)必填")
	}
	// 解析考核指标明细 JSON
	items := make([]hrmsvc.PerfItemInput, 0)
	if itemsStr := req.GetString("items", ""); itemsStr != "" {
		if err := json.Unmarshal([]byte(itemsStr), &items); err != nil {
			return resultError(fmt.Sprintf("考核指标 items 格式错误: %v", err))
		}
	}
	createReq := &hrmsvc.CreatePerfRequest{
		Title:        title,
		EmployeeID:   employeeID,
		EmployeeName: req.GetString("employee_name", ""),
		DeptID:       optUintPtr(req, "dept_id"),
		DeptName:     req.GetString("dept_name", ""),
		Period:       req.GetString("period", ""),
		StartDate:    startDate,
		EndDate:      endDate,
		ReviewerID:   optUintPtr(req, "reviewer_id"),
		Items:        items,
	}
	p, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建绩效考核失败: %v", err))
	}
	return resultText(p)
}

func handleHrmPerformanceSelfReview(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	reviewReq := &hrmsvc.SelfReviewRequest{
		SelfScore:   decimal.NewFromFloat(req.GetFloat("self_score", 0)),
		SelfComment: req.GetString("self_comment", ""),
	}
	if err := svc.SelfReview(ctx, id, reviewReq); err != nil {
		return resultError(fmt.Sprintf("自评失败: %v", err))
	}
	return resultText(map[string]any{"message": "自评已提交", "id": id})
}

func handleHrmPerformanceReview(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	reviewReq := &hrmsvc.ReviewRequest{
		ReviewScore:   decimal.NewFromFloat(req.GetFloat("review_score", 0)),
		ReviewComment: req.GetString("review_comment", ""),
		FinalScore:    decimal.NewFromFloat(req.GetFloat("final_score", 0)),
		Grade:         req.GetString("grade", ""),
	}
	if err := svc.Review(ctx, id, reviewReq); err != nil {
		return resultError(fmt.Sprintf("评审失败: %v", err))
	}
	return resultText(map[string]any{"message": "评审已完成", "id": id})
}

func handleHrmPerformanceDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除绩效考核失败: %v", err))
	}
	return resultText(map[string]any{"message": "绩效考核已删除", "id": id})
}
