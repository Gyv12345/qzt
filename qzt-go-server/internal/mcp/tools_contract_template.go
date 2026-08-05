package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_contract_template.go 合同模板 MCP tools。
// 模板正文为 Markdown 格式,含 ${变量} 占位符,套打时由合同数据替换。

func registerContractTemplateTools(s *server.MCPServer) {
	// crm_contract_template_list — 查询合同模板列表
	s.AddTool(
		mcp.NewTool("crm_contract_template_list",
			mcp.WithDescription("查询合同模板列表(支持分页/关键词/启用状态过滤)"),
			mcp.WithString("keyword", mcp.Description("模板名称关键词")),
			mcp.WithNumber("enabled", mcp.Description("启用状态: 1启用 0停用, 不传查全部")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleContractTemplateList,
	)

	// crm_contract_template_get — 查询模板详情(含正文)
	s.AddTool(
		mcp.NewTool("crm_contract_template_get",
			mcp.WithDescription("查询合同模板详情(含 Markdown 正文)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleContractTemplateGet,
	)

	// crm_contract_template_create — 创建合同模板
	s.AddTool(
		mcp.NewTool("crm_contract_template_create",
			mcp.WithDescription("创建合同模板(正文为 Markdown, 支持 ${变量} 占位符)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("模板名称")),
			mcp.WithString("content", mcp.Required(), mcp.Description("Markdown 正文, 支持 ${contractNo} ${customerName} 等变量占位符")),
			mcp.WithString("remark", mcp.Description("说明")),
			mcp.WithNumber("enabled", mcp.Description("启用状态: 1启用(默认) 0停用")),
		),
		handleContractTemplateCreate,
	)

	// crm_contract_template_update — 更新合同模板
	s.AddTool(
		mcp.NewTool("crm_contract_template_update",
			mcp.WithDescription("更新合同模板(只更新传入的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
			mcp.WithString("name", mcp.Description("模板名称")),
			mcp.WithString("content", mcp.Description("Markdown 正文")),
			mcp.WithString("remark", mcp.Description("说明")),
			mcp.WithNumber("enabled", mcp.Description("启用状态: 1启用 0停用")),
		),
		handleContractTemplateUpdate,
	)

	// crm_contract_template_variables — 查询可用变量清单
	s.AddTool(
		mcp.NewTool("crm_contract_template_variables",
			mcp.WithDescription("查询合同模板可用的全部变量清单(供编辑器插入变量, 返回 key/group/label)"),
		),
		handleContractTemplateVariables,
	)
}

// ── handlers ──

func handleContractTemplateList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewContractTemplateService()
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	keyword := req.GetString("keyword", "")
	var enabled *int8
	if req.GetString("enabled", "") != "" {
		e := int8(req.GetFloat("enabled", 1))
		enabled = &e
	}
	list, total, err := svc.List(ctx, page, pageSize, keyword, enabled)
	if err != nil {
		return resultError(fmt.Sprintf("查询合同模板列表失败: %v", err))
	}
	return resultText(map[string]interface{}{
		"list":  list,
		"total": total,
		"page":  page,
		"size":  pageSize,
	})
}

func handleContractTemplateGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewContractTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	t, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询合同模板失败: %v", err))
	}
	return resultText(t)
}

func handleContractTemplateCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewContractTemplateService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("模板名称(name)必填")
	}
	content := req.GetString("content", "")
	if content == "" {
		return resultError("模板正文(content)必填")
	}
	enabled := int8(req.GetFloat("enabled", 1))
	t, err := svc.Create(ctx, &crmsvc.CreateContractTemplateRequest{
		Name:    name,
		Content: content,
		Remark:  req.GetString("remark", ""),
		Enabled: &enabled,
	}, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建合同模板失败: %v", err))
	}
	return resultText(t)
}

func handleContractTemplateUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewContractTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	updateReq := &crmsvc.UpdateContractTemplateRequest{}
	if v := req.GetString("name", ""); v != "" {
		updateReq.Name = &v
	}
	if v := req.GetString("content", ""); v != "" {
		updateReq.Content = &v
	}
	if v := req.GetString("remark", ""); v != "" {
		updateReq.Remark = &v
	}
	if req.GetString("enabled", "") != "" {
		e := int8(req.GetFloat("enabled", 1))
		updateReq.Enabled = &e
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新合同模板失败: %v", err))
	}
	return resultText(map[string]interface{}{"id": id, "message": "更新成功"})
}

func handleContractTemplateVariables(_ context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return resultText(crmsvc.VariableMetas())
}
