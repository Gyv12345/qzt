package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_form.go OA 表单 tools(表单模板 + 表单数据)。

func registerOaFormTemplateTools(s *server.MCPServer) {
	// ── 表单模板 form_template (7) ──
	s.AddTool(
		mcp.NewTool("oa_form_template_list",
			mcp.WithDescription("查询表单模板管理端列表"),
			mcp.WithString("name", mcp.Description("表单名称关键词")),
			mcp.WithString("category", mcp.Description("分类:business/non-business")),
			mcp.WithNumber("status", mcp.Description("状态:0停用 1启用(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaFormTemplateList,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_list_enabled",
			mcp.WithDescription("查询全部启用的表单模板(用户端)"),
		),
		handleOaFormTemplateListEnabled,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_get",
			mcp.WithDescription("查询表单模板详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleOaFormTemplateGet,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_create",
			mcp.WithDescription("创建表单模板"),
			mcp.WithString("form_key", mcp.Required(), mcp.Description("表单标识(如 seal_apply)")),
			mcp.WithString("name", mcp.Required(), mcp.Description("表单名称")),
			mcp.WithString("fields_config", mcp.Required(), mcp.Description("字段定义JSON")),
			mcp.WithString("icon", mcp.Description("图标")),
			mcp.WithString("description", mcp.Description("描述")),
			mcp.WithString("category", mcp.Description("分类:business/non-business(默认non-business)")),
			mcp.WithNumber("status", mcp.Description("状态:0停用 1启用(默认1)")),
			mcp.WithNumber("sort", mcp.Description("排序")),
		),
		handleOaFormTemplateCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_update",
			mcp.WithDescription("更新表单模板(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
			mcp.WithString("form_key", mcp.Description("表单标识")),
			mcp.WithString("name", mcp.Description("表单名称")),
			mcp.WithString("icon", mcp.Description("图标")),
			mcp.WithString("description", mcp.Description("描述")),
			mcp.WithString("fields_config", mcp.Description("字段定义JSON")),
			mcp.WithString("category", mcp.Description("分类")),
			mcp.WithNumber("status", mcp.Description("状态:0停用 1启用")),
			mcp.WithNumber("sort", mcp.Description("排序")),
		),
		handleOaFormTemplateUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_delete",
			mcp.WithDescription("删除表单模板"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleOaFormTemplateDelete,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_toggle",
			mcp.WithDescription("启用/停用表单模板(切换状态)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleOaFormTemplateToggle,
	)
}

func registerOaFormDataTools(s *server.MCPServer) {
	// ── 表单数据 form_data (5) ──
	s.AddTool(
		mcp.NewTool("oa_form_data_list",
			mcp.WithDescription("查询表单数据列表"),
			mcp.WithNumber("template_id", mcp.Description("模板ID")),
			mcp.WithNumber("submitter_id", mcp.Description("提交人ID")),
			mcp.WithString("template_key", mcp.Description("表单标识")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaFormDataList,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_get",
			mcp.WithDescription("查询表单数据详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("表单数据ID")),
		),
		handleOaFormDataGet,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_create",
			mcp.WithDescription("提交表单数据"),
			mcp.WithNumber("template_id", mcp.Required(), mcp.Description("模板ID")),
			mcp.WithString("field_values", mcp.Required(), mcp.Description("填写数据JSON")),
		),
		handleOaFormDataCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_update",
			mcp.WithDescription("更新表单数据(仅未提交/已驳回可改)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("表单数据ID")),
			mcp.WithString("field_values", mcp.Description("填写数据JSON")),
		),
		handleOaFormDataUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_delete",
			mcp.WithDescription("删除表单数据(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("表单数据ID")),
		),
		handleOaFormDataDelete,
	)
}

// ── 表单模板 handlers ──

func handleOaFormTemplateList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("name", ""),
		req.GetString("category", ""),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单模板列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaFormTemplateListEnabled(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	list, err := svc.ListEnabled(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询启用表单模板失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaFormTemplateGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	tpl, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单模板失败: %v", err))
	}
	return resultText(tpl)
}

func handleOaFormTemplateCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	formKey := req.GetString("form_key", "")
	name := req.GetString("name", "")
	fieldsConfig := req.GetString("fields_config", "")
	if formKey == "" || name == "" || fieldsConfig == "" {
		return resultError("表单标识(form_key)、名称(name)、字段定义(fields_config)必填")
	}
	createReq := &oasvc.CreateFormTemplateRequest{
		FormKey:      formKey,
		Name:         name,
		Icon:         req.GetString("icon", ""),
		Description:  req.GetString("description", ""),
		FieldsConfig: fieldsConfig,
		Category:     req.GetString("category", ""),
		Status:       int8(req.GetFloat("status", 0)),
		Sort:         int(req.GetFloat("sort", 0)),
	}
	tpl, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建表单模板失败: %v", err))
	}
	return resultText(tpl)
}

func handleOaFormTemplateUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("表单模板不存在: %v", err))
	}
	upd := &oasvc.UpdateFormTemplateRequest{
		FormKey:      req.GetString("form_key", existing.FormKey),
		Name:         req.GetString("name", existing.Name),
		Icon:         req.GetString("icon", existing.Icon),
		Description:  req.GetString("description", existing.Description),
		FieldsConfig: req.GetString("fields_config", existing.FieldsConfig),
		Category:     req.GetString("category", existing.Category),
		Status:       int8(req.GetFloat("status", float64(existing.Status))),
		Sort:         int(req.GetFloat("sort", float64(existing.Sort))),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新表单模板失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单模板已更新", "id": id})
}

func handleOaFormTemplateDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除表单模板失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单模板已删除", "id": id})
}

func handleOaFormTemplateToggle(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	if err := svc.ToggleStatus(ctx, id); err != nil {
		return resultError(fmt.Sprintf("切换表单模板状态失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单模板状态已切换", "id": id})
}

// ── 表单数据 handlers ──

func handleOaFormDataList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("template_id", 0)),
		uint(req.GetFloat("submitter_id", 0)),
		req.GetString("template_key", ""),
		req.GetString("template_name", ""),
		req.GetString("approval_status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单数据列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaFormDataGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("表单数据ID(id)必填")
	}
	data, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单数据失败: %v", err))
	}
	return resultText(data)
}

func handleOaFormDataCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	templateID := uint(req.GetFloat("template_id", 0))
	fieldValues := req.GetString("field_values", "")
	if templateID == 0 || fieldValues == "" {
		return resultError("模板ID(template_id)、填写数据(field_values)必填")
	}
	createReq := &oasvc.CreateFormDataRequest{
		TemplateID:  templateID,
		FieldValues: fieldValues,
	}
	data, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("提交表单数据失败: %v", err))
	}
	return resultText(data)
}

func handleOaFormDataUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("表单数据ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("表单数据不存在: %v", err))
	}
	fieldValues := req.GetString("field_values", existing.FieldValues)
	if fieldValues == "" {
		return resultError("填写数据(field_values)不能为空")
	}
	upd := &oasvc.UpdateFormDataRequest{
		FieldValues: fieldValues,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新表单数据失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单数据已更新", "id": id})
}

func handleOaFormDataDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("表单数据ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除表单数据失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单数据已删除", "id": id})
}
