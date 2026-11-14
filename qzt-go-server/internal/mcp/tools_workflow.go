package mcp

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	wfsvc "qzt-go-server/internal/module/workflow/service"
)

// tools_workflow.go 自动化工作流 tools(P27):列表/详情/手动运行/执行记录。

func registerWorkflowTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("workflow_definition_list",
			mcp.WithDescription("查询自动化工作流列表(触发器+动作编排)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
			mcp.WithString("keyword", mcp.Description("名称关键词")),
		),
		handleWorkflowDefinitionList,
	)

	s.AddTool(
		mcp.NewTool("workflow_definition_run",
			mcp.WithDescription("手动运行一次自动化工作流(同步执行,返回执行记录含节点轨迹)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工作流ID")),
		),
		handleWorkflowDefinitionRun,
	)

	s.AddTool(
		mcp.NewTool("workflow_run_list",
			mcp.WithDescription("查询工作流执行记录(状态/耗时/节点轨迹)"),
			mcp.WithNumber("definition_id", mcp.Description("工作流ID(可选过滤)")),
			mcp.WithString("status", mcp.Description("状态过滤:RUNNING/SUCCESS/FAILED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleWorkflowRunList,
	)

	s.AddTool(
		mcp.NewTool("workflow_run_get",
			mcp.WithDescription("查询工作流执行详情(含每节点输入输出轨迹)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("执行记录ID")),
		),
		handleWorkflowRunGet,
	)
}

// ── handlers ──

func handleWorkflowDefinitionList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := wfsvc.NewDefinitionService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize, req.GetString("keyword", ""), "", -1)
	if err != nil {
		return resultError(fmt.Sprintf("查询工作流列表失败: %v", err))
	}
	return resultText(gin.H{"total": total, "list": list})
}

func handleWorkflowDefinitionRun(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	id := uint(req.GetFloat("id", 0))
	run, err := wfsvc.DefaultEngine().RunDefinition(ctx, id, "MANUAL", map[string]any{
		"triggered_by_mcp": true,
	})
	if err != nil {
		if run != nil {
			return resultText(gin.H{"status": run.Status, "error": err.Error(), "run": run})
		}
		return resultError(fmt.Sprintf("运行工作流失败: %v", err))
	}
	return resultText(run)
}

func handleWorkflowRunList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := wfsvc.NewRunService()
	page, pageSize := mcpPage(req)
	defID := uint(req.GetFloat("definition_id", 0))
	list, total, err := svc.ListRuns(ctx, page, pageSize, defID, req.GetString("status", ""))
	if err != nil {
		return resultError(fmt.Sprintf("查询执行记录失败: %v", err))
	}
	return resultText(gin.H{"total": total, "list": list})
}

func handleWorkflowRunGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	id := uint(req.GetFloat("id", 0))
	run, err := wfsvc.NewRunService().GetRun(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询执行详情失败: %v", err))
	}
	return resultText(run)
}
