package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_loan.go OA 借款/备用金 tools。

func registerOaLoanTools(s *server.MCPServer) {
	// ── 借款 loan (6) ──
	s.AddTool(
		mcp.NewTool("oa_loan_list",
			mcp.WithDescription("查询借款/备用金列表"),
			mcp.WithNumber("applicant_id", mcp.Description("借款人ID")),
			mcp.WithString("loan_type", mcp.Description("借款类型:备用金/差旅借支/个人借款/其他")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("repaid_status", mcp.Description("还款状态:0未还 1部分 2已还清")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaLoanList,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_get",
			mcp.WithDescription("查询借款单详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
		),
		handleOaLoanGet,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_create",
			mcp.WithDescription("创建借款/备用金单"),
			mcp.WithString("title", mcp.Required(), mcp.Description("借款标题")),
			mcp.WithString("loan_type", mcp.Required(), mcp.Description("借款类型:备用金/差旅借支/个人借款/其他")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("借款金额(decimal 字符串)")),
			mcp.WithNumber("applicant_id", mcp.Description("借款人ID(默认当前用户)")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("expected_date", mcp.Description("预计还款日期(YYYY-MM-DD)")),
			mcp.WithString("reason", mcp.Description("借款事由")),
		),
		handleOaLoanCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_update",
			mcp.WithDescription("更新借款单(仅未提交/已驳回可改;只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
			mcp.WithString("title", mcp.Description("借款标题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("loan_type", mcp.Description("借款类型")),
			mcp.WithString("amount", mcp.Description("借款金额(decimal 字符串)")),
			mcp.WithString("expected_date", mcp.Description("预计还款日期(YYYY-MM-DD)")),
			mcp.WithString("reason", mcp.Description("借款事由")),
		),
		handleOaLoanUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_delete",
			mcp.WithDescription("删除借款单(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
		),
		handleOaLoanDelete,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_mark_repaid",
			mcp.WithDescription("标记借款已还清(仅审批通过可标记)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
		),
		handleOaLoanMarkRepaid,
	)
}

// ── 借款 handlers ──

func handleOaLoanList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("applicant_id", 0)),
		req.GetString("loan_type", ""),
		req.GetString("approval_status", ""),
		int8(req.GetFloat("repaid_status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询借款列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaLoanGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	loan, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询借款单失败: %v", err))
	}
	return resultText(loan)
}

func handleOaLoanCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	title := req.GetString("title", "")
	loanType := req.GetString("loan_type", "")
	amount := req.GetString("amount", "")
	if title == "" || loanType == "" || amount == "" {
		return resultError("借款标题(title)、类型(loan_type)、金额(amount)必填")
	}
	createReq := &oasvc.CreateLoanRequest{
		Title:        title,
		ApplicantID:  uint(req.GetFloat("applicant_id", 0)),
		DeptID:       optUintPtr(req, "dept_id"),
		LoanType:     loanType,
		Amount:       amount,
		ExpectedDate: req.GetString("expected_date", ""),
		Reason:       req.GetString("reason", ""),
	}
	loan, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建借款单失败: %v", err))
	}
	return resultText(loan)
}

func handleOaLoanUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("借款单不存在: %v", err))
	}
	// amount/expected_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateLoanRequest{
		Title:        req.GetString("title", existing.Title),
		DeptID:       halfUintPtr(req, "dept_id", existing.DeptID),
		LoanType:     req.GetString("loan_type", existing.LoanType),
		Amount:       req.GetString("amount", ""),
		ExpectedDate: req.GetString("expected_date", ""),
		Reason:       req.GetString("reason", existing.Reason),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新借款单失败: %v", err))
	}
	return resultText(map[string]any{"message": "借款单已更新", "id": id})
}

func handleOaLoanDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除借款单失败: %v", err))
	}
	return resultText(map[string]any{"message": "借款单已删除", "id": id})
}

func handleOaLoanMarkRepaid(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	if err := svc.MarkRepaid(ctx, id); err != nil {
		return resultError(fmt.Sprintf("标记还款失败: %v", err))
	}
	return resultText(map[string]any{"message": "借款单已标记还清", "id": id})
}
