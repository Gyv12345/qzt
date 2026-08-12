package mcp

import (
	"context"
	"fmt"
	"strconv"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	syservice "qzt-go-server/internal/module/system/service"
)

// tools_customer.go CRM 客户相关 MCP tools。

func registerCustomerTools(s *server.MCPServer) {
	// crm_customer_list — 查询客户列表
	s.AddTool(
		mcp.NewTool("crm_customer_list",
			mcp.WithDescription("查询CRM客户列表(支持分页和关键词搜索)"),
			mcp.WithString("keyword", mcp.Description("客户名称关键词")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleCustomerList,
	)

	// crm_customer_get — 查询客户详情
	s.AddTool(
		mcp.NewTool("crm_customer_get",
			mcp.WithDescription("查询客户详情(含联系人列表)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("客户ID")),
		),
		handleCustomerGet,
	)

	// crm_customer_create — 创建客户
	s.AddTool(
		mcp.NewTool("crm_customer_create",
			mcp.WithDescription("创建CRM客户"),
			mcp.WithString("name", mcp.Required(), mcp.Description("客户名称")),
			mcp.WithString("level", mcp.Description("客户级别(A/B/C)")),
			mcp.WithString("source", mcp.Description("客户来源")),
			mcp.WithString("industry", mcp.Description("行业")),
		),
		handleCustomerCreate,
	)
}

// ── handlers ──

func handleCustomerList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newCustomerService()
	keyword := req.GetString("keyword", "")
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	list, total, err := svc.List(ctx, page, pageSize, keyword)
	if err != nil {
		return resultError(fmt.Sprintf("查询客户列表失败: %v", err))
	}
	return resultText(map[string]any{
		"list":  list,
		"total": total,
		"page":  page,
		"size":  pageSize,
	})
}

func handleCustomerGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newCustomerService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("客户ID(id)必填")
	}

	customer, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询客户失败: %v", err))
	}
	return resultText(customer)
}

func handleCustomerCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newCustomerService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("客户名称(name)必填")
	}

	// 从 context 取当前用户 ID(API Key 认证写入)
	userID := userIDFromContext(ctx)

	customer, err := svc.Create(ctx, &customerCreateReq{
		Name:     name,
		Level:    req.GetString("level", ""),
		Source:   req.GetString("source", ""),
		Industry: req.GetString("industry", ""),
	}, userID)
	if err != nil {
		return resultError(fmt.Sprintf("创建客户失败: %v", err))
	}
	return resultText(customer)
}

// ── 辅助:从 context 取 user_id ──

// userIDFromContext 从 MCP context 取认证后的 user_id。
// MCP 的 context 不直接携带 gin context,我们用全局 map 传递(简化方案)。
// 更好的方式是 mcp-go 的 session context,但简化版用 env 传递。
func userIDFromContext(ctx context.Context) uint {
	// 从 context 中取 user_id(mcpAuthMiddleware 写入的)
	if v := ctx.Value("user_id"); v != nil {
		if id, ok := v.(uint); ok {
			return id
		}
	}
	return 1 // fallback(不应到达)
}

// parseUint 字符串转 uint。
func parseUint(s string) uint {
	id, _ := strconv.ParseUint(s, 10, 64)
	return uint(id)
}

// 引用避免 unused
var _ = syservice.GetPagination
