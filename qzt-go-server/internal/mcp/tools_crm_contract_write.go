package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	crmsvc "qzt-go-server/internal/module/crm/service"
)

// tools_crm_contract_write.go CRM 合同写 tools(创建/更新)。

func registerCrmContractWriteTools(s *server.MCPServer) {
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
