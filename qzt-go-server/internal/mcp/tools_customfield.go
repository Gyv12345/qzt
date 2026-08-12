package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmmodel "qzt-go-server/internal/model/crm"
	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_customfield.go 自定义字段定义管理 tools(字段配置 CRUD)。

func registerCustomFieldTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_customfield_list",
			mcp.WithDescription("查询某模块的自定义字段定义列表(含选项等大属性)"),
			mcp.WithString("form_key", mcp.Required(), mcp.Description("模块:CUSTOMER客户/OPPORTUNITY商机/CONTRACT合同/PRODUCT商品/FOLLOW_UP_RECORD跟进记录/LEAD线索")),
		),
		handleCustomFieldList,
	)

	s.AddTool(
		mcp.NewTool("crm_customfield_create",
			mcp.WithDescription("新增自定义字段定义"),
			mcp.WithString("form_key", mcp.Required(), mcp.Description("模块:CUSTOMER/OPPORTUNITY/CONTRACT/PRODUCT/FOLLOW_UP_RECORD/LEAD")),
			mcp.WithString("name", mcp.Required(), mcp.Description("字段名称")),
			mcp.WithString("type", mcp.Required(), mcp.Description("字段类型:INPUT/TEXTAREA/INPUT_NUMBER/DATE_TIME/RADIO/CHECKBOX/SELECT/SELECT_MULTIPLE 等")),
			mcp.WithString("internal_key", mcp.Description("内部标识(英文字段名,留空自动生成)")),
			mcp.WithString("prop", mcp.Description("大属性 JSON(选项/校验),如 {\"options\":[{\"value\":\"A\",\"label\":\"A级\"}]}")),
			mcp.WithNumber("mobile", mcp.Description("是否移动端可见:0否 1是")),
			mcp.WithNumber("pos", mcp.Description("排序(默认0)")),
			mcp.WithString("convert_target_field", mcp.Description("转化映射目标字段ID(仅 LEAD:线索转客户时映射到哪个客户字段)")),
		),
		handleCustomFieldCreate,
	)

	s.AddTool(
		mcp.NewTool("crm_customfield_update",
			mcp.WithDescription("更新自定义字段定义(覆盖传入字段)"),
			mcp.WithString("id", mcp.Required(), mcp.Description("字段ID")),
			mcp.WithString("name", mcp.Required(), mcp.Description("字段名称")),
			mcp.WithString("type", mcp.Required(), mcp.Description("字段类型")),
			mcp.WithString("internal_key", mcp.Description("内部标识")),
			mcp.WithString("prop", mcp.Description("大属性 JSON")),
			mcp.WithNumber("mobile", mcp.Description("是否移动端可见:0否 1是")),
			mcp.WithNumber("pos", mcp.Description("排序")),
			mcp.WithString("convert_target_field", mcp.Description("转化映射目标字段ID(仅 LEAD)")),
		),
		handleCustomFieldUpdate,
	)

	s.AddTool(
		mcp.NewTool("crm_customfield_delete",
			mcp.WithDescription("删除自定义字段定义(注意:已录入的该字段数据将不可见)"),
			mcp.WithString("id", mcp.Required(), mcp.Description("字段ID")),
		),
		handleCustomFieldDelete,
	)
}

func handleCustomFieldList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomFieldService()
	formKey := req.GetString("form_key", "")
	if formKey == "" {
		return resultError("模块(form_key)必填")
	}
	list, err := svc.ListFields(ctx, crmmodel.FormKey(formKey))
	if err != nil {
		return resultError(fmt.Sprintf("查询字段定义失败: %v", err))
	}
	return resultText(list)
}

func handleCustomFieldCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomFieldService()
	formKey := req.GetString("form_key", "")
	name := req.GetString("name", "")
	fieldType := req.GetString("type", "")
	if formKey == "" || name == "" || fieldType == "" {
		return resultError("模块(form_key)、字段名称(name)、字段类型(type)必填")
	}
	createReq := &crmsvc.CreateFieldRequest{
		FormKey:            crmmodel.FormKey(formKey),
		InternalKey:        req.GetString("internal_key", ""),
		Name:               name,
		Type:               crmmodel.FieldType(fieldType),
		Prop:               req.GetString("prop", ""),
		Mobile:             int8(req.GetFloat("mobile", 0)),
		Pos:                int64(req.GetFloat("pos", 0)),
		ConvertTargetField: req.GetString("convert_target_field", ""),
	}
	if err := svc.CreateField(ctx, createReq); err != nil {
		return resultError(fmt.Sprintf("创建字段失败: %v", err))
	}
	return resultText(map[string]any{"message": "字段已创建", "form_key": formKey, "name": name})
}

func handleCustomFieldUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomFieldService()
	fieldID := req.GetString("id", "")
	name := req.GetString("name", "")
	fieldType := req.GetString("type", "")
	if fieldID == "" || name == "" || fieldType == "" {
		return resultError("字段ID(id)、字段名称(name)、字段类型(type)必填")
	}
	updateReq := &crmsvc.UpdateFieldRequest{
		InternalKey:        req.GetString("internal_key", ""),
		Name:               name,
		Type:               crmmodel.FieldType(fieldType),
		Prop:               req.GetString("prop", ""),
		Mobile:             int8(req.GetFloat("mobile", 0)),
		Pos:                int64(req.GetFloat("pos", 0)),
		ConvertTargetField: req.GetString("convert_target_field", ""),
	}
	if err := svc.UpdateField(ctx, fieldID, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新字段失败: %v", err))
	}
	return resultText(map[string]any{"message": "字段已更新", "id": fieldID})
}

func handleCustomFieldDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewCustomFieldService()
	fieldID := req.GetString("id", "")
	if fieldID == "" {
		return resultError("字段ID(id)必填")
	}
	if err := svc.DeleteField(ctx, fieldID); err != nil {
		return resultError(fmt.Sprintf("删除字段失败: %v", err))
	}
	return resultText(map[string]any{"message": "字段已删除", "id": fieldID})
}
