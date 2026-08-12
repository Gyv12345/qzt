package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_ticket.go CRM 售后工单 tools(列表/详情/创建/更新/状态流转)。

func registerTicketTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_ticket_list",
			mcp.WithDescription("查询售后工单列表(支持关键词/分类/状态/优先级筛选)"),
			mcp.WithString("keyword", mcp.Description("标题关键词")),
			mcp.WithString("category", mcp.Description("工单分类")),
			mcp.WithNumber("status", mcp.Description("状态:1待处理 2处理中 3已解决 4已关闭 5已重开")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低 2普通 3高 4紧急")),
			mcp.WithNumber("customer_id", mcp.Description("客户ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleTicketList,
	)

	s.AddTool(
		mcp.NewTool("crm_ticket_get",
			mcp.WithDescription("查询工单详情(含处理日志)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工单ID")),
		),
		handleTicketGet,
	)

	s.AddTool(
		mcp.NewTool("crm_ticket_create",
			mcp.WithDescription("创建售后工单(默认状态=待处理,优先级=普通)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("工单标题")),
			mcp.WithString("description", mcp.Description("问题描述")),
			mcp.WithNumber("customer_id", mcp.Description("关联客户ID")),
			mcp.WithString("customer_name", mcp.Description("客户名称(无客户记录时填)")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
			mcp.WithString("contact_name", mcp.Description("联系人姓名")),
			mcp.WithString("contact_phone", mcp.Description("联系电话")),
			mcp.WithString("category", mcp.Description("工单分类")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低 2普通 3高 4紧急(默认2)")),
		),
		handleTicketCreate,
	)

	s.AddTool(
		mcp.NewTool("crm_ticket_update",
			mcp.WithDescription("更新工单信息(已关闭的工单不可编辑)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工单ID")),
			mcp.WithString("title", mcp.Description("工单标题")),
			mcp.WithString("description", mcp.Description("问题描述")),
			mcp.WithNumber("customer_id", mcp.Description("关联客户ID")),
			mcp.WithString("customer_name", mcp.Description("客户名称")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
			mcp.WithString("contact_name", mcp.Description("联系人姓名")),
			mcp.WithString("contact_phone", mcp.Description("联系电话")),
			mcp.WithString("category", mcp.Description("工单分类")),
			mcp.WithNumber("priority", mcp.Description("优先级")),
			mcp.WithNumber("handler_id", mcp.Description("处理人用户ID")),
		),
		handleTicketUpdate,
	)

	s.AddTool(
		mcp.NewTool("crm_ticket_change_status",
			mcp.WithDescription("变更工单状态(会记录处理日志;解决/关闭时可填 solution)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工单ID")),
			mcp.WithNumber("status", mcp.Required(), mcp.Description("目标状态:2处理中 3已解决 4已关闭 5已重开")),
			mcp.WithString("solution", mcp.Description("解决方案(已解决/已关闭时填)")),
			mcp.WithString("comment", mcp.Description("处理备注(写入日志)")),
		),
		handleTicketChangeStatus,
	)
}

func handleTicketList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewTicketService()
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	status := int8(req.GetFloat("status", 0))
	priority := int8(req.GetFloat("priority", 0))
	customerID := uint(req.GetFloat("customer_id", 0))
	list, total, err := svc.List(ctx, page, pageSize, req.GetString("keyword", ""), req.GetString("category", ""), status, priority, customerID, 0)
	if err != nil {
		return resultError(fmt.Sprintf("查询工单列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleTicketGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewTicketService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("工单ID(id)必填")
	}
	t, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询工单失败: %v", err))
	}
	return resultText(t)
}

func handleTicketCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewTicketService()
	title := req.GetString("title", "")
	if title == "" {
		return resultError("工单标题(title)必填")
	}
	createReq := &crmsvc.CreateTicketRequest{
		Title:        title,
		Description:  req.GetString("description", ""),
		CustomerName: req.GetString("customer_name", ""),
		ContactName:  req.GetString("contact_name", ""),
		ContactPhone: req.GetString("contact_phone", ""),
		Category:     req.GetString("category", ""),
		Priority:     int8(req.GetFloat("priority", 0)),
	}
	if cid := uint(req.GetFloat("customer_id", 0)); cid > 0 {
		createReq.CustomerID = &cid
	}
	if conID := uint(req.GetFloat("contract_id", 0)); conID > 0 {
		createReq.ContractID = &conID
	}
	t, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建工单失败: %v", err))
	}
	return resultText(t)
}

func handleTicketUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewTicketService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("工单ID(id)必填")
	}
	updateReq := &crmsvc.UpdateTicketRequest{
		Title:        req.GetString("title", ""),
		Description:  req.GetString("description", ""),
		CustomerName: req.GetString("customer_name", ""),
		ContactName:  req.GetString("contact_name", ""),
		ContactPhone: req.GetString("contact_phone", ""),
		Category:     req.GetString("category", ""),
		Priority:     int8(req.GetFloat("priority", 0)),
	}
	if cid := uint(req.GetFloat("customer_id", 0)); cid > 0 {
		updateReq.CustomerID = &cid
	}
	if conID := uint(req.GetFloat("contract_id", 0)); conID > 0 {
		updateReq.ContractID = &conID
	}
	if hid := uint(req.GetFloat("handler_id", 0)); hid > 0 {
		updateReq.HandlerID = &hid
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新工单失败: %v", err))
	}
	return resultText(map[string]any{"message": "工单已更新", "id": id})
}

func handleTicketChangeStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewTicketService()
	id := uint(req.GetFloat("id", 0))
	status := int8(req.GetFloat("status", 0))
	if id == 0 || status == 0 {
		return resultError("工单ID(id)和目标状态(status)必填")
	}
	changeReq := &crmsvc.ChangeStatusRequest{
		Status:   status,
		Solution: req.GetString("solution", ""),
		Comment:  req.GetString("comment", ""),
	}
	if err := svc.ChangeStatus(ctx, id, changeReq, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("变更工单状态失败: %v", err))
	}
	return resultText(map[string]any{"message": "工单状态已变更", "id": id, "status": status})
}
