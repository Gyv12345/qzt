package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	crmsvc "qzt-go-server/internal/module/crm/service"
	"qzt-go-server/pkg/xtime"
)

// tools_crm_followup_write.go CRM 跟进写 tools(跟进记录/跟进计划)。

func registerCrmFollowupWriteTools(s *server.MCPServer) {
	// ── 跟进 ──
	s.AddTool(
		mcp.NewTool("crm_followup_record_create",
			mcp.WithDescription("创建跟进记录(至少关联一个资源:客户/商机/联系人/合同;跟进人默认当前用户)"),
			mcp.WithString("type", mcp.Required(), mcp.Description("跟进方式:WECHAT/PHONE/VISIT/EMAIL/OTHER")),
			mcp.WithString("content", mcp.Required(), mcp.Description("跟进内容")),
			mcp.WithString("follow_time", mcp.Description("跟进时间(YYYY-MM-DD HH:mm:ss,默认当前时间)")),
			mcp.WithNumber("customer_id", mcp.Description("关联客户ID")),
			mcp.WithNumber("opportunity_id", mcp.Description("关联商机ID")),
			mcp.WithNumber("contact_id", mcp.Description("关联联系人ID")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
		),
		handleFollowupRecordCreate,
	)

	s.AddTool(
		mcp.NewTool("crm_followup_plan_create",
			mcp.WithDescription("创建跟进计划(待办;负责人默认当前用户)"),
			mcp.WithString("type", mcp.Required(), mcp.Description("跟进方式:WECHAT/PHONE/VISIT/EMAIL/OTHER")),
			mcp.WithString("content", mcp.Required(), mcp.Description("计划内容")),
			mcp.WithString("plan_time", mcp.Required(), mcp.Description("计划时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("remind_time", mcp.Description("提醒时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithNumber("owner_id", mcp.Description("负责人用户ID(默认当前用户)")),
			mcp.WithNumber("customer_id", mcp.Description("关联客户ID")),
			mcp.WithNumber("opportunity_id", mcp.Description("关联商机ID")),
			mcp.WithNumber("contact_id", mcp.Description("关联联系人ID")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
		),
		handleFollowupPlanCreate,
	)
}

// ── 跟进 handlers ──

func handleFollowupRecordCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewFollowService()
	followType := req.GetString("type", "")
	content := req.GetString("content", "")
	if followType == "" || content == "" {
		return resultError("跟进方式(type)和跟进内容(content)必填")
	}
	followTime := xtime.Now()
	if v := req.GetString("follow_time", ""); v != "" {
		t, err := parseFlexTime(v)
		if err != nil {
			return resultError(err.Error())
		}
		followTime = xtime.NewDateTime(t)
	}
	createReq := &crmsvc.CreateRecordRequest{
		Type:       followType,
		Content:    content,
		FollowTime: followTime,
		OwnerID:    userIDFromContext(ctx),
	}
	customerID, opportunityID, contactID, contractID := assocIDs(req)
	createReq.CustomerID, createReq.OpportunityID = customerID, opportunityID
	createReq.ContactID, createReq.ContractID = contactID, contractID
	if customerID == nil && opportunityID == nil && contactID == nil && contractID == nil {
		return resultError("至少关联一个资源:customer_id/opportunity_id/contact_id/contract_id")
	}
	rec, err := svc.CreateRecord(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建跟进记录失败: %v", err))
	}
	return resultText(rec)
}

func handleFollowupPlanCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewFollowService()
	followType := req.GetString("type", "")
	content := req.GetString("content", "")
	planTimeStr := req.GetString("plan_time", "")
	if followType == "" || content == "" || planTimeStr == "" {
		return resultError("跟进方式(type)、计划内容(content)、计划时间(plan_time)必填")
	}
	planTime, err := parseFlexTime(planTimeStr)
	if err != nil {
		return resultError(err.Error())
	}
	remindTime, err := parseNullDateTime(req.GetString("remind_time", ""))
	if err != nil {
		return resultError(err.Error())
	}
	ownerID := uint(req.GetFloat("owner_id", 0))
	if ownerID == 0 {
		ownerID = userIDFromContext(ctx)
	}
	createReq := &crmsvc.CreatePlanRequest{
		Type:       followType,
		Content:    content,
		PlanTime:   xtime.NewDateTime(planTime),
		RemindTime: remindTime,
		OwnerID:    ownerID,
	}
	createReq.CustomerID, createReq.OpportunityID, createReq.ContactID, createReq.ContractID = assocIDs(req)
	plan, err := svc.CreatePlan(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建跟进计划失败: %v", err))
	}
	return resultText(plan)
}

// assocIDs 取四个关联 ID(>0 才返回指针)。
func assocIDs(req mcp.CallToolRequest) (customerID, opportunityID, contactID, contractID *uint) {
	if v := uint(req.GetFloat("customer_id", 0)); v > 0 {
		customerID = &v
	}
	if v := uint(req.GetFloat("opportunity_id", 0)); v > 0 {
		opportunityID = &v
	}
	if v := uint(req.GetFloat("contact_id", 0)); v > 0 {
		contactID = &v
	}
	if v := uint(req.GetFloat("contract_id", 0)); v > 0 {
		contractID = &v
	}
	return
}
