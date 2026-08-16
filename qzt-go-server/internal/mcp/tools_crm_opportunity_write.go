package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_crm_opportunity_write.go CRM 商机写 tools(创建/更新/阶段流转)。

func registerCrmOpportunityWriteTools(s *server.MCPServer) {
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
	if argPresent(req, "expected_amount") {
		createReq.ExpectedAmount = decimal.NewFromFloat(req.GetFloat("expected_amount", 0))
	}
	if argPresent(req, "probability") {
		p := int(req.GetFloat("probability", 0))
		createReq.Probability = &p
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
