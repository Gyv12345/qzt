package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_worklog.go OA 工作日志 tools。

func registerOaWorkLogTools(s *server.MCPServer) {
	// ── 工作日志 work_log (5) ──
	s.AddTool(
		mcp.NewTool("oa_work_log_list",
			mcp.WithDescription("查询工作日志列表"),
			mcp.WithString("log_type", mcp.Description("类型:DAILY/WEEKLY/MONTHLY")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaWorkLogList,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_get",
			mcp.WithDescription("查询工作日志详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日志ID")),
		),
		handleOaWorkLogGet,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_create",
			mcp.WithDescription("创建工作日志"),
			mcp.WithString("log_date", mcp.Required(), mcp.Description("日志日期(YYYY-MM-DD)")),
			mcp.WithString("log_type", mcp.Description("类型:DAILY/WEEKLY/MONTHLY(默认DAILY)")),
			mcp.WithString("content", mcp.Description("今日完成")),
			mcp.WithString("plan", mcp.Description("明日计划")),
			mcp.WithString("problems", mcp.Description("遇到问题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
		),
		handleOaWorkLogCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_update",
			mcp.WithDescription("更新工作日志(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日志ID")),
			mcp.WithString("log_type", mcp.Description("类型")),
			mcp.WithString("log_date", mcp.Description("日志日期(YYYY-MM-DD)")),
			mcp.WithString("content", mcp.Description("今日完成")),
			mcp.WithString("plan", mcp.Description("明日计划")),
			mcp.WithString("problems", mcp.Description("遇到问题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
		),
		handleOaWorkLogUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_delete",
			mcp.WithDescription("删除工作日志"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日志ID")),
		),
		handleOaWorkLogDelete,
	)
}

// ── 工作日志 handlers ──

func handleOaWorkLogList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("log_type", ""),
		req.GetString("log_date", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询工作日志列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaWorkLogGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日志ID(id)必填")
	}
	log, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询工作日志失败: %v", err))
	}
	return resultText(log)
}

func handleOaWorkLogCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	logDate := req.GetString("log_date", "")
	if logDate == "" {
		return resultError("日志日期(log_date)必填")
	}
	createReq := &oasvc.CreateWorkLogRequest{
		LogType:  req.GetString("log_type", ""),
		LogDate:  logDate,
		Content:  req.GetString("content", ""),
		Plan:     req.GetString("plan", ""),
		Problems: req.GetString("problems", ""),
		DeptID:   optUintPtr(req, "dept_id"),
	}
	log, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建工作日志失败: %v", err))
	}
	return resultText(log)
}

func handleOaWorkLogUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日志ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("日志不存在: %v", err))
	}
	// log_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateWorkLogRequest{
		LogType:  req.GetString("log_type", existing.LogType),
		LogDate:  req.GetString("log_date", ""),
		Content:  req.GetString("content", existing.Content),
		Plan:     req.GetString("plan", existing.Plan),
		Problems: req.GetString("problems", existing.Problems),
		DeptID:   halfUintPtr(req, "dept_id", existing.DeptID),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新工作日志失败: %v", err))
	}
	return resultText(map[string]any{"message": "工作日志已更新", "id": id})
}

func handleOaWorkLogDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日志ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除工作日志失败: %v", err))
	}
	return resultText(map[string]any{"message": "工作日志已删除", "id": id})
}
