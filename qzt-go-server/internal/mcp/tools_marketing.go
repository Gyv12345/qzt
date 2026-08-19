package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	mktsvc "qzt-go-server/internal/module/marketing/service"
)

// tools_marketing.go 营销模块 MCP tools(渠道账号/同步日志/手动同步)。
// 工具名前缀 marketing_ → toolset 过滤;perm_map.go 必须登记映射,否则非超管默认拒绝。

func registerMarketingTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("marketing_account_list",
			mcp.WithDescription("获取营销渠道账号列表(抖音/巨量引擎,token 字段脱敏)"),
		),
		handleMarketingAccountList,
	)

	s.AddTool(
		mcp.NewTool("marketing_log_list",
			mcp.WithDescription("分页查询营销线索同步日志(广告线索入库/跳过/失败记录)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20,最大100)")),
			mcp.WithNumber("account_id", mcp.Description("按渠道账号过滤")),
			mcp.WithNumber("status", mcp.Description("按状态过滤:1已入库 2重复跳过 3失败")),
			mcp.WithString("keyword", mcp.Description("关键词(姓名/手机号)")),
		),
		handleMarketingLogList,
	)

	s.AddTool(
		mcp.NewTool("marketing_sync_trigger",
			mcp.WithDescription("立即触发一次指定渠道账号的抖音线索同步,返回入库/跳过/失败统计"),
			mcp.WithNumber("account_id", mcp.Required(), mcp.Description("渠道账号ID")),
		),
		handleMarketingSyncTrigger,
	)
}

func handleMarketingAccountList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	list, err := mktsvc.NewAccountService().List(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询渠道账号失败: %v", err))
	}
	return resultText(list)
}

func handleMarketingLogList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if pageSize > 100 {
		pageSize = 100
	}
	list, total, err := mktsvc.NewLogService().List(ctx, page, pageSize,
		uint(req.GetFloat("account_id", 0)), int8(req.GetFloat("status", 0)),
		req.GetString("keyword", ""), "", "")
	if err != nil {
		return resultError(fmt.Sprintf("查询同步日志失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total})
}

func handleMarketingSyncTrigger(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	accountID := uint(req.GetFloat("account_id", 0))
	if accountID == 0 {
		return resultError("缺少参数 account_id")
	}
	result, err := mktsvc.NewSyncService().SyncAccount(ctx, accountID)
	if err != nil {
		return resultError(fmt.Sprintf("同步失败: %v", err))
	}
	return resultText(result)
}
