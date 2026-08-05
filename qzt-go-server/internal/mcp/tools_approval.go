package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	apprsvc "qzt-go-server/internal/module/approval/service"
)

// tools_approval.go 审批模块 MCP tools(流程查询/设计/审批操作/待办/实例)。

func registerApprovalTools(s *server.MCPServer) {
	// ── 审批流 ──
	s.AddTool(
		mcp.NewTool("approval_flow_list",
			mcp.WithDescription("查询审批流列表(所有已配置的审批流程)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleApprovalFlowList,
	)

	s.AddTool(
		mcp.NewTool("approval_flow_get",
			mcp.WithDescription("查询审批流详情(含节点图/审批人配置)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("审批流ID")),
		),
		handleApprovalFlowGet,
	)

	// ── 待办/已办/我发起的 ──
	s.AddTool(
		mcp.NewTool("approval_todo_list",
			mcp.WithDescription("查询我的审批待办列表"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleApprovalTodoList,
	)

	s.AddTool(
		mcp.NewTool("approval_processed_list",
			mcp.WithDescription("查询我已处理的审批列表"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleApprovalProcessedList,
	)

	s.AddTool(
		mcp.NewTool("approval_initiated_list",
			mcp.WithDescription("查询我发起的审批列表"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleApprovalInitiatedList,
	)

	// ── 实例详情 ──
	s.AddTool(
		mcp.NewTool("approval_instance_get",
			mcp.WithDescription("查询审批实例详情(含审批任务/审批记录/当前状态)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("审批实例ID")),
		),
		handleApprovalInstanceGet,
	)

	// ── 流程设计 ──
	s.AddTool(
		mcp.NewTool("approval_flow_create",
			mcp.WithDescription("创建审批流(创建后需调用 approval_flow_save_design 设计节点图,再 approval_flow_enable 启用)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("流程名称,如 合同审批")),
			mcp.WithString("form_type", mcp.Required(), mcp.Description("表单类型:CONTRACT/QUOTATION/ORDER/INVOICE/PURCHASE_ORDER/SALES_ORDER/PURCHASE_RETURN/SALES_RETURN")),
			mcp.WithString("number", mcp.Description("流程编号(留空自动生成)")),
			mcp.WithBoolean("enable", mcp.Description("是否启用(默认false,设计好节点图后再启用)")),
		),
		handleApprovalFlowCreate,
	)

	s.AddTool(
		mcp.NewTool("approval_flow_save_design",
			mcp.WithDescription("保存审批流节点图设计(创建新版本)。design_json 为 JSON 字符串,包含 nodes/approvers/conditions/links 四个数组。nodes 每项: number/name/node_type(START/APPROVAL/CONDITION/END)/sort。approvers 每项: node_number/approval_type(SEQUENCE/PARALLEL)/approver_type(USER/ROLE/DEPT_LEADER/UPPER)/approver_list(逗号分隔ID)/multi_approver_mode(ALL/ANY)/empty_approver_action(PASS/REJECT/SUBMITTER)/same_submitter_action(SKIP/PASS)。links 每项: from_node_number/to_node_number/sort。"),
			mcp.WithNumber("flow_id", mcp.Required(), mcp.Description("审批流ID")),
			mcp.WithString("design_json", mcp.Required(), mcp.Description("节点图设计 JSON 字符串(含 nodes/approvers/conditions/links 数组)")),
		),
		handleApprovalFlowSaveDesign,
	)

	s.AddTool(
		mcp.NewTool("approval_flow_enable",
			mcp.WithDescription("启用或禁用审批流(启用前必须已保存节点图设计)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("审批流ID")),
			mcp.WithBoolean("enable", mcp.Required(), mcp.Description("true启用 false禁用")),
		),
		handleApprovalFlowEnable,
	)

	// ── 审批操作 ──
	s.AddTool(
		mcp.NewTool("approval_approve",
			mcp.WithDescription("审批通过(通过指定的审批任务)"),
			mcp.WithNumber("task_id", mcp.Required(), mcp.Description("审批任务ID(从 approval_todo_list 获取)")),
			mcp.WithString("comment", mcp.Description("审批意见")),
		),
		handleApprovalApprove,
	)

	s.AddTool(
		mcp.NewTool("approval_reject",
			mcp.WithDescription("驳回审批(任一驳回即整实例驳回)"),
			mcp.WithNumber("task_id", mcp.Required(), mcp.Description("审批任务ID")),
			mcp.WithString("comment", mcp.Required(), mcp.Description("驳回原因(必填)")),
		),
		handleApprovalReject,
	)

	s.AddTool(
		mcp.NewTool("approval_revoke",
			mcp.WithDescription("撤回审批(仅提交人可撤回,仅审批中可撤回)"),
			mcp.WithNumber("instance_id", mcp.Required(), mcp.Description("审批实例ID")),
		),
		handleApprovalRevoke,
	)
}

// ── handlers ──

func handleApprovalFlowList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewFlowService()
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.List(ctx, page, pageSize)
	if err != nil {
		return resultError(fmt.Sprintf("查询审批流列表失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleApprovalFlowGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewFlowService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("审批流ID(id)必填")
	}
	detail, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询审批流失败: %v", err))
	}
	return resultText(detail)
}

func handleApprovalTodoList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewTodoService()
	userID := userIDFromContext(ctx)
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.ListTodo(ctx, page, pageSize, userID)
	if err != nil {
		return resultError(fmt.Sprintf("查询待办失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleApprovalProcessedList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewTodoService()
	userID := userIDFromContext(ctx)
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.ListProcessed(ctx, page, pageSize, userID)
	if err != nil {
		return resultError(fmt.Sprintf("查询已办失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleApprovalInitiatedList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewTodoService()
	userID := userIDFromContext(ctx)
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.ListInitiated(ctx, page, pageSize, userID)
	if err != nil {
		return resultError(fmt.Sprintf("查询我发起的失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleApprovalInstanceGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewTodoService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("审批实例ID(id)必填")
	}
	detail, err := svc.GetDetail(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询审批实例失败: %v", err))
	}
	return resultText(detail)
}

// ── 流程设计 handlers ──

func handleApprovalFlowCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewFlowService()
	name := req.GetString("name", "")
	formType := req.GetString("form_type", "")
	if name == "" || formType == "" {
		return resultError("流程名称(name)和表单类型(form_type)必填")
	}
	enable := int8(0)
	if req.GetBool("enable", false) {
		enable = 1
	}
	flow, err := svc.Create(ctx, &apprsvc.CreateFlowRequest{
		Name:     name,
		FormType: formType,
		Number:   req.GetString("number", ""),
		Enable:   enable,
	})
	if err != nil {
		return resultError(fmt.Sprintf("创建审批流失败: %v", err))
	}
	return resultText(flow)
}

func handleApprovalFlowSaveDesign(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewFlowService()
	flowID := uint(req.GetFloat("flow_id", 0))
	designJSON := req.GetString("design_json", "")
	if flowID == 0 || designJSON == "" {
		return resultError("审批流ID(flow_id)和节点图JSON(design_json)必填")
	}

	var design apprsvc.SaveDesignRequest
	if err := json.Unmarshal([]byte(designJSON), &design); err != nil {
		return resultError(fmt.Sprintf("节点图JSON解析失败: %v。请检查格式:nodes/approvers/conditions/links 四个数组", err))
	}
	if len(design.Nodes) == 0 {
		return resultError("nodes 数组不能为空")
	}

	if err := svc.SaveDesign(ctx, flowID, &design); err != nil {
		return resultError(fmt.Sprintf("保存流程设计失败: %v", err))
	}
	return resultText(map[string]interface{}{
		"message":     "流程设计已保存(新版本已创建)",
		"flow_id":     flowID,
		"nodes_count": len(design.Nodes),
		"next_step":   "调用 approval_flow_enable(id, enable=true) 启用流程",
	})
}

func handleApprovalFlowEnable(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewFlowService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("审批流ID(id)必填")
	}
	enable := int8(0)
	if req.GetBool("enable", false) {
		enable = 1
	}
	if err := svc.Enable(ctx, id, enable); err != nil {
		return resultError(fmt.Sprintf("启用/禁用失败: %v", err))
	}
	action := "已禁用"
	if enable == 1 {
		action = "已启用"
	}
	return resultText(map[string]interface{}{"message": fmt.Sprintf("审批流%s", action), "flow_id": id})
}

// ── 审批操作 handlers ──

func handleApprovalApprove(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewApprovalService()
	taskID := uint(req.GetFloat("task_id", 0))
	if taskID == 0 {
		return resultError("审批任务ID(task_id)必填")
	}
	userID := userIDFromContext(ctx)
	if err := svc.Approve(ctx, &apprsvc.ApproveRequest{
		TaskID:  taskID,
		Comment: req.GetString("comment", ""),
	}, userID); err != nil {
		return resultError(fmt.Sprintf("审批通过失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "审批已通过", "task_id": taskID})
}

func handleApprovalReject(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewApprovalService()
	taskID := uint(req.GetFloat("task_id", 0))
	comment := req.GetString("comment", "")
	if taskID == 0 || comment == "" {
		return resultError("审批任务ID(task_id)和驳回原因(comment)必填")
	}
	userID := userIDFromContext(ctx)
	if err := svc.Reject(ctx, &apprsvc.RejectRequest{
		TaskID:  taskID,
		Comment: comment,
	}, userID); err != nil {
		return resultError(fmt.Sprintf("驳回失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "审批已驳回", "task_id": taskID})
}

func handleApprovalRevoke(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apprsvc.NewApprovalService()
	instanceID := uint(req.GetFloat("instance_id", 0))
	if instanceID == 0 {
		return resultError("审批实例ID(instance_id)必填")
	}
	userID := userIDFromContext(ctx)
	if err := svc.Revoke(ctx, instanceID, userID); err != nil {
		return resultError(fmt.Sprintf("撤回失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "审批已撤回", "instance_id": instanceID})
}
