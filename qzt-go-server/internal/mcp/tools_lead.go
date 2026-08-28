package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_lead.go CRM 线索相关 MCP tools。

func newLeadService() *crmsvc.LeadService {
	return crmsvc.NewLeadService()
}

func registerLeadTools(s *server.MCPServer) {
	// crm_lead_list — 查询线索列表
	s.AddTool(
		mcp.NewTool("crm_lead_list",
			mcp.WithDescription("查询CRM线索列表(支持分页、关键词和条件筛选)"),
			mcp.WithString("keyword", mcp.Description("线索名称关键词")),
			mcp.WithString("level", mcp.Description("级别(A/B/C)")),
			mcp.WithString("source", mcp.Description("来源")),
			mcp.WithString("status", mcp.Description("状态(1新建/2跟进中/3已转化/4无效)")),
			mcp.WithString("industry", mcp.Description("行业")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleLeadList,
	)

	// crm_lead_get — 查询线索详情
	s.AddTool(
		mcp.NewTool("crm_lead_get",
			mcp.WithDescription("查询CRM线索详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("线索ID")),
		),
		handleLeadGet,
	)

	// crm_lead_create — 创建线索
	s.AddTool(
		mcp.NewTool("crm_lead_create",
			mcp.WithDescription("创建CRM线索"),
			mcp.WithString("name", mcp.Required(), mcp.Description("线索名称")),
			mcp.WithString("contact_name", mcp.Description("联系人姓名")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("company", mcp.Description("公司")),
			mcp.WithString("level", mcp.Description("级别(A/B/C)")),
			mcp.WithString("source", mcp.Description("来源")),
			mcp.WithString("industry", mcp.Description("行业")),
		),
		handleLeadCreate,
	)

	// crm_lead_update — 更新线索
	s.AddTool(
		mcp.NewTool("crm_lead_update",
			mcp.WithDescription("更新CRM线索信息"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("线索ID")),
			mcp.WithString("name", mcp.Required(), mcp.Description("线索名称")),
			mcp.WithString("contact_name", mcp.Description("联系人姓名")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("company", mcp.Description("公司")),
			mcp.WithString("level", mcp.Description("级别(A/B/C)")),
			mcp.WithString("source", mcp.Description("来源")),
			mcp.WithString("industry", mcp.Description("行业")),
			mcp.WithString("status", mcp.Description("状态(1新建/2跟进中/3已转化/4无效)")),
		),
		handleLeadUpdate,
	)

	// crm_lead_convert — 线索转化为客户
	s.AddTool(
		mcp.NewTool("crm_lead_convert",
			mcp.WithDescription("将CRM线索转化为客户"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("线索ID")),
		),
		handleLeadConvert,
	)
}

// ── handlers ──

func handleLeadList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newLeadService()
	keyword := req.GetString("keyword", "")
	level := req.GetString("level", "")
	source := req.GetString("source", "")
	status := req.GetString("status", "")
	industry := req.GetString("industry", "")
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	list, total, err := svc.List(ctx, page, pageSize, keyword, level, source, status, industry, "", 0)
	if err != nil {
		return resultError(fmt.Sprintf("查询线索列表失败: %v", err))
	}
	return resultText(map[string]any{
		"list":  list,
		"total": total,
		"page":  page,
		"size":  pageSize,
	})
}

func handleLeadGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newLeadService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("线索ID(id)必填")
	}
	lead, _, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询线索失败: %v", err))
	}
	return resultText(lead)
}

func handleLeadCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newLeadService()
	leadReq := &crmsvc.CreateLeadRequest{
		Name:        req.GetString("name", ""),
		ContactName: req.GetString("contact_name", ""),
		Phone:       req.GetString("phone", ""),
		Email:       req.GetString("email", ""),
		Company:     req.GetString("company", ""),
		Level:       req.GetString("level", ""),
		Source:      req.GetString("source", ""),
		Industry:    req.GetString("industry", ""),
	}
	if leadReq.Name == "" {
		return resultError("线索名称(name)必填")
	}
	userID := getUserIDFromCtx(ctx)
	lead, err := svc.Create(ctx, leadReq, userID)
	if err != nil {
		return resultError(fmt.Sprintf("创建线索失败: %v", err))
	}
	return resultText(map[string]any{
		"message": "线索创建成功",
		"id":      lead.ID,
		"lead_no": lead.LeadNo,
	})
}

func handleLeadUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newLeadService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("线索ID(id)必填")
	}
	statusStr := req.GetString("status", "")
	var statusPtr *int8
	if statusStr != "" {
		var s int8
		fmt.Sscanf(statusStr, "%d", &s)
		statusPtr = &s
	}
	leadReq := &crmsvc.UpdateLeadRequest{
		Name:        req.GetString("name", ""),
		ContactName: req.GetString("contact_name", ""),
		Phone:       req.GetString("phone", ""),
		Email:       req.GetString("email", ""),
		Company:     req.GetString("company", ""),
		Level:       req.GetString("level", ""),
		Source:      req.GetString("source", ""),
		Industry:    req.GetString("industry", ""),
		Status:      statusPtr,
	}
	userID := getUserIDFromCtx(ctx)
	if err := svc.Update(ctx, id, leadReq, userID); err != nil {
		return resultError(fmt.Sprintf("更新线索失败: %v", err))
	}
	return resultText(map[string]any{"message": "线索更新成功"})
}

func handleLeadConvert(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newLeadService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("线索ID(id)必填")
	}
	userID := getUserIDFromCtx(ctx)
	customer, err := svc.Convert(ctx, id, userID)
	if err != nil {
		return resultError(fmt.Sprintf("线索转化失败: %v", err))
	}
	return resultText(map[string]any{
		"message":       "线索已转化为客户",
		"customer_id":   customer.ID,
		"customer_name": customer.Name,
	})
}

// getUserIDFromCtx 从 MCP 上下文获取操作人ID(复用 system 工具的 helper)。
// getUserIDFromCtx 从 request context 取 API Key 绑定用户ID(mcpAuthMiddleware 注入)。
func getUserIDFromCtx(ctx context.Context) uint {
	if v, ok := ctx.Value(mcpUserIDKey).(uint); ok {
		return v
	}
	return 0
}
