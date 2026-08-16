package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_crm_payment_write.go CRM 回款写 tools(回款计划/回款记录)。

func registerCrmPaymentWriteTools(s *server.MCPServer) {
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
