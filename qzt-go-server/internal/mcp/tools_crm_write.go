package mcp

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	crmsvc "qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// tools_crm_write.go CRM 写操作 tools(客户流转/商机/合同/回款/跟进/查重)。
// 更新类工具采用「先 Get 再覆盖传入字段」的半增量模式,AI 只需传要改的字段。

func registerCrmWriteTools(s *server.MCPServer) {
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

	// ── 商机 ──
	s.AddTool(
		mcp.NewTool("crm_opportunity_create",
			mcp.WithDescription("创建CRM商机(负责人默认当前用户,阶段默认 PROSPECTING)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("商机名称")),
			mcp.WithNumber("customer_id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithNumber("expected_amount", mcp.Description("预期金额")),
			mcp.WithString("expected_close_date", mcp.Description("预计成交日期(YYYY-MM-DD)")),
			mcp.WithString("stage", mcp.Description("阶段:PROSPECTING/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST")),
			mcp.WithNumber("probability", mcp.Description("成交概率(0-100)")),
			mcp.WithString("description", mcp.Description("描述")),
		),
		handleOpportunityCreate,
	)

	s.AddTool(
		mcp.NewTool("crm_opportunity_update",
			mcp.WithDescription("更新商机信息(只传要修改的字段;阶段流转请用 crm_opportunity_change_stage)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("商机ID")),
			mcp.WithString("name", mcp.Description("商机名称")),
			mcp.WithNumber("customer_id", mcp.Description("客户ID")),
			mcp.WithNumber("expected_amount", mcp.Description("预期金额")),
			mcp.WithString("expected_close_date", mcp.Description("预计成交日期(YYYY-MM-DD)")),
			mcp.WithNumber("probability", mcp.Description("成交概率(0-100)")),
			mcp.WithString("description", mcp.Description("描述")),
		),
		handleOpportunityUpdate,
	)

	s.AddTool(
		mcp.NewTool("crm_opportunity_change_stage",
			mcp.WithDescription("变更商机阶段(会记录阶段历史)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("商机ID")),
			mcp.WithString("to_stage", mcp.Required(), mcp.Description("目标阶段:PROSPECTING/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST")),
			mcp.WithString("reason", mcp.Description("变更原因")),
		),
		handleOpportunityChangeStage,
	)

	// ── 合同 ──
	s.AddTool(
		mcp.NewTool("crm_contract_create",
			mcp.WithDescription("创建CRM合同(默认 DRAFT 阶段;创建后可用 approval_push 发起审批)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("合同名称")),
			mcp.WithNumber("customer_id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithNumber("total_amount", mcp.Required(), mcp.Description("合同金额")),
			mcp.WithString("contract_no", mcp.Description("合同编号(留空自动生成)")),
			mcp.WithNumber("opportunity_id", mcp.Description("关联商机ID")),
			mcp.WithString("signed_date", mcp.Description("签订日期(YYYY-MM-DD)")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithString("content", mcp.Description("合同内容")),
		),
		handleContractCreate,
	)

	s.AddTool(
		mcp.NewTool("crm_contract_update",
			mcp.WithDescription("更新合同信息(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("合同ID")),
			mcp.WithString("name", mcp.Description("合同名称")),
			mcp.WithNumber("customer_id", mcp.Description("客户ID")),
			mcp.WithNumber("total_amount", mcp.Description("合同金额")),
			mcp.WithNumber("opportunity_id", mcp.Description("关联商机ID(传 0 解除关联)")),
			mcp.WithString("signed_date", mcp.Description("签订日期(YYYY-MM-DD)")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithString("stage", mcp.Description("阶段:DRAFT/APPROVAL/SIGNED/EXECUTING/COMPLETED/TERMINATED")),
			mcp.WithString("content", mcp.Description("合同内容")),
		),
		handleContractUpdate,
	)

	// ── 回款 ──
	s.AddTool(
		mcp.NewTool("crm_payment_plan_create",
			mcp.WithDescription("创建合同回款计划"),
			mcp.WithNumber("contract_id", mcp.Required(), mcp.Description("合同ID")),
			mcp.WithString("plan_date", mcp.Required(), mcp.Description("计划回款日期(YYYY-MM-DD)")),
			mcp.WithNumber("plan_amount", mcp.Required(), mcp.Description("计划回款金额")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePaymentPlanCreate,
	)

	s.AddTool(
		mcp.NewTool("crm_payment_record_create",
			mcp.WithDescription("登记合同回款记录(自动累计合同已回款;关联计划则同步计划状态)"),
			mcp.WithNumber("contract_id", mcp.Required(), mcp.Description("合同ID")),
			mcp.WithNumber("amount", mcp.Required(), mcp.Description("回款金额(必须>0)")),
			mcp.WithString("received_date", mcp.Required(), mcp.Description("回款日期(YYYY-MM-DD)")),
			mcp.WithNumber("plan_id", mcp.Description("关联回款计划ID(可选)")),
			mcp.WithString("method", mcp.Description("回款方式,如 银行转账/微信/支付宝")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePaymentRecordCreate,
	)

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

	// ── 查重 ──
	s.AddTool(
		mcp.NewTool("crm_dedup",
			mcp.WithDescription("客户/线索查重:名称模糊匹配(线索名称/联系人/公司、客户名称)+电话精确匹配(线索电话、客户联系人电话),跨线索和客户两表检索相似记录。录入前建议先查重"),
			mcp.WithString("name", mcp.Description("名称(模糊)")),
			mcp.WithString("phone", mcp.Description("电话(精确)")),
		),
		handleCrmDedup,
	)

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
	if args := req.GetArguments(); args != nil {
		if _, ok := args["status"]; ok {
			st := int8(req.GetFloat("status", float64(existing.Status)))
			updateReq.Status = &st
		}
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

// ── 商机 handlers ──

func handleOpportunityCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewOpportunityService()
	name := req.GetString("name", "")
	customerID := uint(req.GetFloat("customer_id", 0))
	if name == "" || customerID == 0 {
		return resultError("商机名称(name)和客户ID(customer_id)必填")
	}
	closeDate, err := parseNullDate(req.GetString("expected_close_date", ""))
	if err != nil {
		return resultError(err.Error())
	}
	createReq := &crmsvc.CreateOpportunityRequest{
		Name:              name,
		CustomerID:        customerID,
		ExpectedCloseDate: closeDate,
		Stage:             req.GetString("stage", ""),
		Description:       req.GetString("description", ""),
	}
	if args := req.GetArguments(); args != nil {
		if _, ok := args["expected_amount"]; ok {
			createReq.ExpectedAmount = decimal.NewFromFloat(req.GetFloat("expected_amount", 0))
		}
		if _, ok := args["probability"]; ok {
			p := int(req.GetFloat("probability", 0))
			createReq.Probability = &p
		}
	}
	opp, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建商机失败: %v", err))
	}
	return resultText(opp)
}

func handleOpportunityUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewOpportunityService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("商机ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("商机不存在: %v", err))
	}

	name := req.GetString("name", existing.Name)
	if name == "" {
		return resultError("商机名称不能为空")
	}
	customerID := uint(req.GetFloat("customer_id", float64(existing.CustomerID)))
	if customerID == 0 {
		return resultError("客户ID不能为空")
	}
	updateReq := &crmsvc.UpdateOpportunityRequest{
		Name:              name,
		CustomerID:        customerID,
		ExpectedAmount:    existing.ExpectedAmount,
		ExpectedCloseDate: existing.ExpectedCloseDate,
		Stage:             existing.Stage,
		Probability:       existing.Probability,
		OwnerID:           existing.OwnerID,
		Description:       req.GetString("description", existing.Description),
	}
	if args := req.GetArguments(); args != nil {
		if _, ok := args["expected_amount"]; ok {
			updateReq.ExpectedAmount = decimal.NewFromFloat(req.GetFloat("expected_amount", 0))
		}
		if _, ok := args["probability"]; ok {
			p := int(req.GetFloat("probability", 0))
			updateReq.Probability = &p
		}
		if v, ok := args["expected_close_date"].(string); ok && v != "" {
			d, err := parseNullDate(v)
			if err != nil {
				return resultError(err.Error())
			}
			updateReq.ExpectedCloseDate = d
		}
	}
	if err := svc.Update(ctx, id, updateReq, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新商机失败: %v", err))
	}
	return resultText(map[string]any{"message": "商机已更新", "id": id})
}

func handleOpportunityChangeStage(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewOpportunityService()
	id := uint(req.GetFloat("id", 0))
	toStage := req.GetString("to_stage", "")
	if id == 0 || toStage == "" {
		return resultError("商机ID(id)和目标阶段(to_stage)必填")
	}
	if err := svc.ChangeStage(ctx, id, toStage, userIDFromContext(ctx), req.GetString("reason", "")); err != nil {
		return resultError(fmt.Sprintf("变更阶段失败: %v", err))
	}
	return resultText(map[string]any{"message": "商机阶段已变更", "id": id, "to_stage": toStage})
}

// ── 合同 handlers ──

func handleContractCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewContractService()
	name := req.GetString("name", "")
	customerID := uint(req.GetFloat("customer_id", 0))
	amount := req.GetFloat("total_amount", 0)
	if name == "" || customerID == 0 || amount <= 0 {
		return resultError("合同名称(name)、客户ID(customer_id)、合同金额(total_amount,>0)必填")
	}
	signedDate, err := parseNullDate(req.GetString("signed_date", ""))
	if err != nil {
		return resultError(err.Error())
	}
	startDate, err := parseNullDate(req.GetString("start_date", ""))
	if err != nil {
		return resultError(err.Error())
	}
	endDate, err := parseNullDate(req.GetString("end_date", ""))
	if err != nil {
		return resultError(err.Error())
	}
	createReq := &crmsvc.CreateContractRequest{
		Name:        name,
		ContractNo:  req.GetString("contract_no", ""),
		CustomerID:  customerID,
		TotalAmount: decimal.NewFromFloat(amount),
		SignedDate:  signedDate,
		StartDate:   startDate,
		EndDate:     endDate,
		Content:     req.GetString("content", ""),
	}
	if oppID := uint(req.GetFloat("opportunity_id", 0)); oppID > 0 {
		createReq.OpportunityID = &oppID
	}
	contract, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建合同失败: %v", err))
	}
	return resultText(contract)
}

func handleContractUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewContractService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("合同ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("合同不存在: %v", err))
	}

	name := req.GetString("name", existing.Name)
	if name == "" {
		return resultError("合同名称不能为空")
	}
	customerID := uint(req.GetFloat("customer_id", float64(existing.CustomerID)))
	if customerID == 0 {
		return resultError("客户ID不能为空")
	}
	updateReq := &crmsvc.UpdateContractRequest{
		Name:          name,
		CustomerID:    customerID,
		OpportunityID: existing.OpportunityID,
		TitleID:       existing.TitleID,
		TotalAmount:   existing.TotalAmount,
		SignedDate:    existing.SignedDate,
		StartDate:     existing.StartDate,
		EndDate:       existing.EndDate,
		Stage:         req.GetString("stage", existing.Stage),
		OwnerID:       existing.OwnerID,
		Content:       req.GetString("content", existing.Content),
	}
	if args := req.GetArguments(); args != nil {
		if _, ok := args["total_amount"]; ok {
			amount := req.GetFloat("total_amount", 0)
			if amount <= 0 {
				return resultError("合同金额(total_amount)必须大于 0")
			}
			updateReq.TotalAmount = decimal.NewFromFloat(amount)
		}
		if v, ok := args["opportunity_id"]; ok {
			oppID := uint(0)
			if f, ok2 := v.(float64); ok2 {
				oppID = uint(f)
			}
			if oppID > 0 {
				updateReq.OpportunityID = &oppID
			} else {
				updateReq.OpportunityID = nil
			}
		}
		for _, field := range []string{"signed_date", "start_date", "end_date"} {
			if v, ok := args[field].(string); ok && v != "" {
				d, err := parseNullDate(v)
				if err != nil {
					return resultError(err.Error())
				}
				switch field {
				case "signed_date":
					updateReq.SignedDate = d
				case "start_date":
					updateReq.StartDate = d
				case "end_date":
					updateReq.EndDate = d
				}
			}
		}
	}
	if err := svc.Update(ctx, id, updateReq, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新合同失败: %v", err))
	}
	return resultText(map[string]any{"message": "合同已更新", "id": id})
}

// ── 回款 handlers ──

func handlePaymentPlanCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewPaymentService()
	contractID := uint(req.GetFloat("contract_id", 0))
	planAmount := req.GetFloat("plan_amount", 0)
	planDate, err := parseNullDate(req.GetString("plan_date", ""))
	if contractID == 0 || planAmount <= 0 || err != nil || planDate.IsZero() {
		if err != nil {
			return resultError(err.Error())
		}
		return resultError("合同ID(contract_id)、计划日期(plan_date)、计划金额(plan_amount,>0)必填")
	}
	plan, err := svc.CreatePlan(ctx, &crmsvc.CreatePaymentPlanRequest{
		ContractID: contractID,
		PlanDate:   planDate,
		PlanAmount: decimal.NewFromFloat(planAmount),
		Remark:     req.GetString("remark", ""),
	})
	if err != nil {
		return resultError(fmt.Sprintf("创建回款计划失败: %v", err))
	}
	return resultText(plan)
}

func handlePaymentRecordCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := crmsvc.NewPaymentService()
	contractID := uint(req.GetFloat("contract_id", 0))
	amount := req.GetFloat("amount", 0)
	receivedDate, err := parseNullDate(req.GetString("received_date", ""))
	if contractID == 0 || amount <= 0 || err != nil || receivedDate.IsZero() {
		if err != nil {
			return resultError(err.Error())
		}
		return resultError("合同ID(contract_id)、回款日期(received_date)、回款金额(amount,>0)必填")
	}
	createReq := &crmsvc.CreatePaymentRecordRequest{
		ContractID:   contractID,
		ReceivedDate: receivedDate,
		Amount:       decimal.NewFromFloat(amount),
		Method:       req.GetString("method", ""),
		Remark:       req.GetString("remark", ""),
	}
	if planID := uint(req.GetFloat("plan_id", 0)); planID > 0 {
		createReq.PlanID = &planID
	}
	rec, err := svc.CreateRecord(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("登记回款失败: %v", err))
	}
	return resultText(rec)
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

// ── 查重 handler ──

type dedupLeadItem struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Company     string `json:"company"`
	Status      int8   `json:"status"`
	OwnerID     *uint  `json:"owner_id"`
}

type dedupCustomerItem struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	CustomerNo string `json:"customer_no"`
	Status     int8   `json:"status"`
	OwnerID    *uint  `json:"owner_id"`
}

func handleCrmDedup(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name := strings.TrimSpace(req.GetString("name", ""))
	phone := strings.TrimSpace(req.GetString("phone", ""))
	if name == "" && phone == "" {
		return resultError("name 和 phone 至少传一个")
	}

	db := repository.DBFrom(ctx)
	leads := make([]dedupLeadItem, 0)
	customers := make([]dedupCustomerItem, 0)

	// 线索:名称模糊(名称/联系人/公司) 或 电话精确
	leadQuery := db.Table("crm_lead").
		Select("id, name, contact_name, phone, company, status, owner_id").
		Limit(5)
	if name != "" && phone != "" {
		leadQuery = leadQuery.Where(
			"name LIKE ? OR contact_name LIKE ? OR company LIKE ? OR phone = ?",
			"%"+name+"%", "%"+name+"%", "%"+name+"%", phone)
	} else if name != "" {
		leadQuery = leadQuery.Where(
			"name LIKE ? OR contact_name LIKE ? OR company LIKE ?",
			"%"+name+"%", "%"+name+"%", "%"+name+"%")
	} else {
		leadQuery = leadQuery.Where("phone = ?", phone)
	}
	if err := leadQuery.Scan(&leads).Error; err != nil {
		return resultError(fmt.Sprintf("查重失败: %v", err))
	}

	// 客户:名称模糊;电话精确则经联系人表关联合并
	custCols := "crm_customer.id, crm_customer.name, crm_customer.customer_no, crm_customer.status, crm_customer.owner_id"
	if name != "" {
		if err := db.Table("crm_customer").Select(custCols).
			Where("crm_customer.name LIKE ?", "%"+name+"%").Limit(5).
			Scan(&customers).Error; err != nil {
			return resultError(fmt.Sprintf("查重失败: %v", err))
		}
	}
	if phone != "" {
		phoneHits := make([]dedupCustomerItem, 0)
		if err := db.Table("crm_customer").Select(custCols).
			Joins("JOIN crm_customer_contact cc ON cc.customer_id = crm_customer.id AND cc.phone = ?", phone).
			Limit(5).Scan(&phoneHits).Error; err != nil {
			return resultError(fmt.Sprintf("查重失败: %v", err))
		}
		seen := make(map[uint]bool, len(customers)+len(phoneHits))
		merged := make([]dedupCustomerItem, 0, len(customers)+len(phoneHits))
		for _, list := range [][]dedupCustomerItem{customers, phoneHits} {
			for _, item := range list {
				if seen[item.ID] {
					continue
				}
				seen[item.ID] = true
				merged = append(merged, item)
			}
		}
		customers = merged
		if len(customers) > 5 {
			customers = customers[:5]
		}
	}

	return resultText(map[string]any{
		"leads":     leads,
		"customers": customers,
		"hint":      "若存在相似记录,建议先核对再决定是否新建",
	})
}

// ── 本文件辅助函数 ──

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

// parseFlexTime 解析 "YYYY-MM-DD[ HH:mm:ss]" 或 RFC3339。
func parseFlexTime(s string) (time.Time, error) {
	str := strings.TrimSpace(s)
	for _, layout := range []string{xtime.DateTimeFormat, xtime.DateFormat, time.RFC3339, "2006-01-02T15:04:05"} {
		if t, err := time.ParseInLocation(layout, str, time.Local); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析时间 %q,支持格式: YYYY-MM-DD HH:mm:ss / YYYY-MM-DD", s)
}

// parseNullDate 解析日期字符串为 NullDateTime(空串返回零值)。
func parseNullDate(s string) (xtime.NullDateTime, error) {
	if strings.TrimSpace(s) == "" {
		return xtime.NullDateTime{}, nil
	}
	t, err := parseFlexTime(s)
	if err != nil {
		return xtime.NullDateTime{}, err
	}
	return xtime.NewNullDateTimeFromTime(t), nil
}

// parseNullDateTime 同 parseNullDate,语义别名(时间字段)。
func parseNullDateTime(s string) (xtime.NullDateTime, error) {
	return parseNullDate(s)
}
