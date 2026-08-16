package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_crm_customer_write.go CRM 客户流转 tools(更新/转移/释放/捡入)。

func registerCrmCustomerFlowTools(s *server.MCPServer) {
	// ── 客户流转 ──
	s.AddTool(
		mcp.NewTool("crm_customer_update",
			mcp.WithDescription("更新CRM客户信息(只传要修改的字段即可)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithString("name", mcp.Description("客户名称")),
			mcp.WithString("level", mcp.Description("客户级别(A/B/C)")),
			mcp.WithString("source", mcp.Description("客户来源")),
			mcp.WithString("industry", mcp.Description("行业")),
			mcp.WithNumber("status", mcp.Description("状态:1正常 2冻结 3流失")),
		),
		handleCustomerUpdate,
	)

	s.AddTool(
		mcp.NewTool("crm_customer_transfer",
			mcp.WithDescription("转移客户给其他负责人"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithNumber("to_user_id", mcp.Required(), mcp.Description("新负责人用户ID(可用 system_user_list 查询)")),
		),
		handleCustomerTransfer,
	)

	s.AddTool(
		mcp.NewTool("crm_customer_release",
			mcp.WithDescription("释放客户到公海池"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithNumber("pool_id", mcp.Required(), mcp.Description("公海池ID")),
			mcp.WithString("reason", mcp.Description("释放原因")),
		),
		handleCustomerRelease,
	)

	s.AddTool(
		mcp.NewTool("crm_customer_pick",
			mcp.WithDescription("从公海捡入客户(当前用户成为负责人)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("客户ID")),
		),
		handleCustomerPick,
	)
}

// ── 客户流转 handlers ──

func handleCustomerUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomerService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("客户ID(id)必填")
	}
	existing, _, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("客户不存在: %v", err))
	}

	name := req.GetString("name", existing.Name)
	if name == "" {
		return resultError("客户名称不能为空")
	}
	updateReq := &crmsvc.UpdateCustomerRequest{
		Name:     name,
		Level:    req.GetString("level", existing.Level),
		Source:   req.GetString("source", existing.Source),
		Industry: req.GetString("industry", existing.Industry),
	}
	if argPresent(req, "status") {
		st := int8(req.GetFloat("status", float64(existing.Status)))
		updateReq.Status = &st
	}
	if err := svc.Update(ctx, id, updateReq, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新客户失败: %v", err))
	}
	return resultText(map[string]any{"message": "客户已更新", "id": id})
}

func handleCustomerTransfer(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomerService()
	id := uint(req.GetFloat("id", 0))
	toUserID := uint(req.GetFloat("to_user_id", 0))
	if id == 0 || toUserID == 0 {
		return resultError("客户ID(id)和新负责人ID(to_user_id)必填")
	}
	if err := svc.Transfer(ctx, id, toUserID, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("转移客户失败: %v", err))
	}
	return resultText(map[string]any{"message": "客户已转移", "id": id, "to_user_id": toUserID})
}

func handleCustomerRelease(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomerService()
	id := uint(req.GetFloat("id", 0))
	poolID := uint(req.GetFloat("pool_id", 0))
	if id == 0 || poolID == 0 {
		return resultError("客户ID(id)和公海池ID(pool_id)必填")
	}
	if err := svc.ReleaseToPool(ctx, id, poolID, userIDFromContext(ctx), req.GetString("reason", "")); err != nil {
		return resultError(fmt.Sprintf("释放客户失败: %v", err))
	}
	return resultText(map[string]any{"message": "客户已释放到公海", "id": id, "pool_id": poolID})
}

func handleCustomerPick(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomerService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("客户ID(id)必填")
	}
	userID := userIDFromContext(ctx)
	if err := svc.PickFromPool(ctx, id, userID); err != nil {
		return resultError(fmt.Sprintf("捡入客户失败: %v", err))
	}
	return resultText(map[string]any{"message": "已从公海捡入", "id": id, "owner_id": userID})
}
