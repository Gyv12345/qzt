package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_payroll.go HRM 薪酬写 tools。

func registerHrmPayrollTools(s *server.MCPServer) {
	// ── 薪酬 ──
	s.AddTool(
		mcp.NewTool("hrm_payroll_save_structure",
			mcp.WithDescription("保存员工薪酬结构(upsert:有则更新无则创建)。涉及敏感薪资数据"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithNumber("base_salary", mcp.Description("基本工资")),
			mcp.WithNumber("position_allowance", mcp.Description("岗位津贴")),
			mcp.WithNumber("performance_allowance", mcp.Description("绩效津贴")),
			mcp.WithNumber("meal_allowance", mcp.Description("餐补")),
			mcp.WithNumber("transport_allowance", mcp.Description("交通补贴")),
			mcp.WithNumber("social_ins_rate", mcp.Description("社保比例(如0.105表示10.5%,默认)")),
			mcp.WithNumber("housing_fund_rate", mcp.Description("公积金比例(如0.07表示7%,默认)")),
			mcp.WithNumber("social_ins_base", mcp.Description("社保基数(为0则用基本工资)")),
			mcp.WithNumber("housing_fund_base", mcp.Description("公积金基数(为0则用基本工资)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmPayrollSaveStructure,
	)
	s.AddTool(
		mcp.NewTool("hrm_payroll_generate",
			mcp.WithDescription("生成/刷新员工月度工资条(自动算社保/公积金/个税/实发)。需先配置薪酬结构"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("year_month", mcp.Required(), mcp.Description("月份(YYYY-MM)")),
		),
		handleHrmPayrollGenerate,
	)
	s.AddTool(
		mcp.NewTool("hrm_payroll_confirm",
			mcp.WithDescription("确认工资条(草稿→已确认,仅草稿状态可确认)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工资条ID")),
		),
		handleHrmPayrollConfirm,
	)
	s.AddTool(
		mcp.NewTool("hrm_payroll_mark_paid",
			mcp.WithDescription("标记工资条已发放(已确认→已发放)。财务敏感动作,标记后工资条进入已发放状态"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工资条ID")),
		),
		handleHrmPayrollMarkPaid,
	)
}

// ── 薪酬 handlers ──

func handleHrmPayrollSaveStructure(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	if employeeID == 0 {
		return resultError("员工ID(employee_id)必填")
	}
	saveReq := &hrmsvc.SaveStructureRequest{
		EmployeeID:       employeeID,
		BaseSalary:       decimal.NewFromFloat(req.GetFloat("base_salary", 0)),
		PositionAllow:    decimal.NewFromFloat(req.GetFloat("position_allowance", 0)),
		PerformanceAllow: decimal.NewFromFloat(req.GetFloat("performance_allowance", 0)),
		MealAllow:        decimal.NewFromFloat(req.GetFloat("meal_allowance", 0)),
		TransportAllow:   decimal.NewFromFloat(req.GetFloat("transport_allowance", 0)),
		SocialInsRate:    decimal.NewFromFloat(req.GetFloat("social_ins_rate", 0)),
		HousingFundRate:  decimal.NewFromFloat(req.GetFloat("housing_fund_rate", 0)),
		SocialInsBase:    decimal.NewFromFloat(req.GetFloat("social_ins_base", 0)),
		HousingFundBase:  decimal.NewFromFloat(req.GetFloat("housing_fund_base", 0)),
		Remark:           req.GetString("remark", ""),
	}
	structure, err := svc.SaveStructure(ctx, saveReq)
	if err != nil {
		return resultError(fmt.Sprintf("保存薪酬结构失败: %v", err))
	}
	return resultText(structure)
}

func handleHrmPayrollGenerate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	yearMonth := req.GetString("year_month", "")
	if employeeID == 0 || yearMonth == "" {
		return resultError("员工ID(employee_id)和月份(year_month)必填")
	}
	payroll, err := svc.GeneratePayroll(ctx, &hrmsvc.GeneratePayrollRequest{
		EmployeeID: employeeID,
		YearMonth:  yearMonth,
	})
	if err != nil {
		return resultError(fmt.Sprintf("生成工资条失败: %v", err))
	}
	return resultText(payroll)
}

func handleHrmPayrollConfirm(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("工资条ID(id)必填")
	}
	if err := svc.ConfirmPayroll(ctx, id); err != nil {
		return resultError(fmt.Sprintf("确认工资条失败: %v", err))
	}
	return resultText(map[string]any{"message": "工资条已确认", "id": id})
}

func handleHrmPayrollMarkPaid(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("工资条ID(id)必填")
	}
	if err := svc.MarkPaid(ctx, id); err != nil {
		return resultError(fmt.Sprintf("标记发放失败: %v", err))
	}
	return resultText(map[string]any{"message": "工资条已标记发放", "id": id})
}
