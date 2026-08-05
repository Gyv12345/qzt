package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	apisvc "qzt-go-server/internal/module/api/service"
)

// tools_other.go CRM 业务 tools(商机/合同/产品/联系人/回款/跟进/仪表盘)。

func registerOpportunityTools(s *server.MCPServer) {
	// crm_opportunity_list — 商机列表
	s.AddTool(
		mcp.NewTool("crm_opportunity_list",
			mcp.WithDescription("查询CRM商机列表(支持关键词/阶段筛选)"),
			mcp.WithString("keyword", mcp.Description("商机名称关键词")),
			mcp.WithString("stage", mcp.Description("阶段:PROSPECTING/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOpportunityList,
	)

	// crm_opportunity_get — 商机详情
	s.AddTool(
		mcp.NewTool("crm_opportunity_get",
			mcp.WithDescription("查询商机详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("商机ID")),
		),
		handleOpportunityGet,
	)
}

func handleOpportunityList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newOpportunityService()
	keyword := req.GetString("keyword", "")
	stage := req.GetString("stage", "")
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.List(ctx, page, pageSize, keyword, stage)
	if err != nil {
		return resultError(fmt.Sprintf("查询商机列表失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOpportunityGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newOpportunityService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("商机ID(id)必填")
	}
	o, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询商机失败: %v", err))
	}
	return resultText(o)
}

// ── Contract ──

func registerContractTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_contract_list",
			mcp.WithDescription("查询CRM合同列表(支持关键词/阶段筛选)"),
			mcp.WithString("keyword", mcp.Description("合同名称关键词")),
			mcp.WithString("stage", mcp.Description("阶段:DRAFT/EXECUTING/COMPLETED/TERMINATED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleContractList,
	)

	s.AddTool(
		mcp.NewTool("crm_contract_get",
			mcp.WithDescription("查询合同详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("合同ID")),
		),
		handleContractGet,
	)

	s.AddTool(
		mcp.NewTool("crm_contract_payment_summary",
			mcp.WithDescription("查询合同回款汇总(总额/已回款/回款计划列表)"),
			mcp.WithNumber("contract_id", mcp.Required(), mcp.Description("合同ID")),
		),
		handleContractPaymentSummary,
	)
}

func handleContractList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newContractService()
	keyword := req.GetString("keyword", "")
	stage := req.GetString("stage", "")
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.List(ctx, page, pageSize, keyword, stage)
	if err != nil {
		return resultError(fmt.Sprintf("查询合同列表失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleContractGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newContractService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("合同ID(id)必填")
	}
	c, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询合同失败: %v", err))
	}
	return resultText(c)
}

func handleContractPaymentSummary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newPaymentService()
	contractID := uint(req.GetFloat("contract_id", 0))
	if contractID == 0 {
		return resultError("合同ID(contract_id)必填")
	}
	summary, err := svc.ContractSummary(ctx, contractID)
	if err != nil {
		return resultError(fmt.Sprintf("查询回款汇总失败: %v", err))
	}
	return resultText(summary)
}

// ── Product ──

func registerProductTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_product_list",
			mcp.WithDescription("查询CRM产品列表"),
			mcp.WithString("keyword", mcp.Description("产品名称关键词")),
			mcp.WithString("category", mcp.Description("产品分类")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleProductList,
	)

	s.AddTool(
		mcp.NewTool("crm_product_get",
			mcp.WithDescription("查询产品详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("产品ID")),
		),
		handleProductGet,
	)
}

func handleProductList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newProductService()
	keyword := req.GetString("keyword", "")
	category := req.GetString("category", "")
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.List(ctx, page, pageSize, keyword, category)
	if err != nil {
		return resultError(fmt.Sprintf("查询产品列表失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleProductGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newProductService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("产品ID(id)必填")
	}
	p, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询产品失败: %v", err))
	}
	return resultText(p)
}

// ── Contact ──

func registerContactTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_contact_list",
			mcp.WithDescription("查询某客户的全部联系人"),
			mcp.WithNumber("customer_id", mcp.Required(), mcp.Description("客户ID")),
		),
		handleContactList,
	)
}

func handleContactList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newContactService()
	customerID := uint(req.GetFloat("customer_id", 0))
	if customerID == 0 {
		return resultError("客户ID(customer_id)必填")
	}
	list, err := svc.ListByCustomer(ctx, customerID)
	if err != nil {
		return resultError(fmt.Sprintf("查询联系人失败: %v", err))
	}
	return resultText(list)
}

// ── Payment ──

func registerPaymentTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_payment_plan_list",
			mcp.WithDescription("查询合同回款计划列表"),
			mcp.WithNumber("contract_id", mcp.Required(), mcp.Description("合同ID")),
		),
		handlePaymentPlanList,
	)

	s.AddTool(
		mcp.NewTool("crm_payment_record_list",
			mcp.WithDescription("查询合同回款记录列表"),
			mcp.WithNumber("contract_id", mcp.Required(), mcp.Description("合同ID")),
		),
		handlePaymentRecordList,
	)
}

func handlePaymentPlanList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newPaymentService()
	contractID := uint(req.GetFloat("contract_id", 0))
	if contractID == 0 {
		return resultError("合同ID(contract_id)必填")
	}
	list, err := svc.ListPlansByContract(ctx, contractID)
	if err != nil {
		return resultError(fmt.Sprintf("查询回款计划失败: %v", err))
	}
	return resultText(list)
}

func handlePaymentRecordList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newPaymentService()
	contractID := uint(req.GetFloat("contract_id", 0))
	if contractID == 0 {
		return resultError("合同ID(contract_id)必填")
	}
	list, err := svc.ListRecordsByContract(ctx, contractID)
	if err != nil {
		return resultError(fmt.Sprintf("查询回款记录失败: %v", err))
	}
	return resultText(list)
}

// ── Followup ──

func registerFollowupTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("crm_followup_list",
			mcp.WithDescription("查询跟进记录时间线(按客户/商机/合同/联系人)"),
			mcp.WithString("field", mcp.Required(), mcp.Description("关联字段:customer_id/opportunity_id/contract_id/contact_id")),
			mcp.WithNumber("value", mcp.Required(), mcp.Description("关联ID")),
		),
		handleFollowupList,
	)
}

func handleFollowupList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newFollowupService()
	field := req.GetString("field", "")
	value := uint(req.GetFloat("value", 0))
	if field == "" || value == 0 {
		return resultError("field 和 value 必填")
	}
	list, err := svc.Timeline(ctx, field, value)
	if err != nil {
		return resultError(fmt.Sprintf("查询跟进记录失败: %v", err))
	}
	return resultText(list)
}

// ── Dashboard ──

func registerDashboardTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("dashboard_overview",
			mcp.WithDescription("查询工作台核心指标(客户/商机/合同/回款/待审批等汇总数据)"),
		),
		handleDashboardOverview,
	)

	s.AddTool(
		mcp.NewTool("dashboard_opportunity_funnel",
			mcp.WithDescription("查询商机漏斗(各阶段数量与金额)"),
		),
		handleDashboardFunnel,
	)

	s.AddTool(
		mcp.NewTool("dashboard_sales_trend",
			mcp.WithDescription("查询近N天回款趋势"),
			mcp.WithNumber("days", mcp.Description("天数(默认30)")),
		),
		handleDashboardTrend,
	)
}

func handleDashboardOverview(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	userID := userIDFromContext(ctx)
	data, err := svc.Overview(ctx, userID)
	if err != nil {
		return resultError(fmt.Sprintf("查询概览失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardFunnel(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	data, err := svc.OpportunityFunnel(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询漏斗失败: %v", err))
	}
	return resultText(data)
}

func handleDashboardTrend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := apisvc.NewDashboardService()
	days := int(req.GetFloat("days", 30))
	if days <= 0 {
		days = 30
	}
	data, err := svc.SalesTrend(ctx, days)
	if err != nil {
		return resultError(fmt.Sprintf("查询趋势失败: %v", err))
	}
	return resultText(data)
}
