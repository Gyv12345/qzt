package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_crm_lead_write.go CRM 线索公海 tools(转移/释放/领取)。

func registerCrmLeadPoolTools(s *server.MCPServer) {
	// ── 线索公海 ──
	s.AddTool(
		mcp.NewTool("crm_lead_transfer",
			mcp.WithDescription("转移线索给其他负责人"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("线索ID")),
			mcp.WithNumber("to_user_id", mcp.Required(), mcp.Description("新负责人用户ID")),
		),
		handleLeadTransfer,
	)
	s.AddTool(
		mcp.NewTool("crm_lead_release",
			mcp.WithDescription("释放线索到公海池"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("线索ID")),
			mcp.WithNumber("pool_id", mcp.Required(), mcp.Description("线索公海池ID")),
			mcp.WithString("reason", mcp.Description("释放原因")),
		),
		handleLeadRelease,
	)
	s.AddTool(
		mcp.NewTool("crm_lead_pick",
			mcp.WithDescription("从公海领取线索(当前用户成为负责人)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("线索ID")),
		),
		handleLeadPick,
	)
}

// ── 线索公海 handlers ──

func handleLeadTransfer(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewLeadService()
	id := uint(req.GetFloat("id", 0))
	toUserID := uint(req.GetFloat("to_user_id", 0))
	if id == 0 || toUserID == 0 {
		return resultError("线索ID(id)和新负责人ID(to_user_id)必填")
	}
	if err := svc.Transfer(ctx, id, toUserID, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("转移线索失败: %v", err))
	}
	return resultText(map[string]any{"message": "线索已转移", "id": id, "to_user_id": toUserID})
}

func handleLeadRelease(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewLeadService()
	id := uint(req.GetFloat("id", 0))
	poolID := uint(req.GetFloat("pool_id", 0))
	if id == 0 || poolID == 0 {
		return resultError("线索ID(id)和公海池ID(pool_id)必填")
	}
	if err := svc.ReleaseToPool(ctx, id, poolID, userIDFromContext(ctx), req.GetString("reason", "")); err != nil {
		return resultError(fmt.Sprintf("释放线索失败: %v", err))
	}
	return resultText(map[string]any{"message": "线索已释放到公海", "id": id, "pool_id": poolID})
}

func handleLeadPick(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewLeadService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("线索ID(id)必填")
	}
	userID := userIDFromContext(ctx)
	if err := svc.PickFromPool(ctx, id, userID); err != nil {
		return resultError(fmt.Sprintf("领取线索失败: %v", err))
	}
	return resultText(map[string]any{"message": "已从公海领取线索", "id": id, "owner_id": userID})
}
