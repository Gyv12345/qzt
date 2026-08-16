package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_expense.go OA 报销 tools。

func registerOaExpenseTools(s *server.MCPServer) {
	// ── 报销 expense (6) ──
	s.AddTool(
		mcp.NewTool("oa_expense_list",
			mcp.WithDescription("查询报销单列表"),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID")),
			mcp.WithString("expense_type", mcp.Description("费用类型")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("payment_status", mcp.Description("打款状态:0未打款 1已打款")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaExpenseList,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_get",
			mcp.WithDescription("查询报销单详情(含明细行)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
		),
		handleOaExpenseGet,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_create",
			mcp.WithDescription("创建报销单(含明细行)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("报销标题")),
			mcp.WithString("expense_type", mcp.Required(), mcp.Description("费用类型")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("报销总额(decimal 字符串)")),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID(默认当前用户)")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("occur_date", mcp.Description("费用发生日期(YYYY-MM-DD)")),
			mcp.WithString("description", mcp.Description("说明")),
			mcp.WithString("items", mcp.Description("明细行JSON数组,如 [{\"item_type\":\"\",\"amount\":\"100\",\"occur_date\":\"2026-08-01\",\"invoice_no\":\"\",\"remark\":\"\"}]")),
		),
		handleOaExpenseCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_update",
			mcp.WithDescription("更新报销单(仅未提交/已驳回可改;只传要修改的字段。注意:传 items 会整体重建明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
			mcp.WithString("title", mcp.Description("报销标题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("expense_type", mcp.Description("费用类型")),
			mcp.WithString("amount", mcp.Description("报销总额(decimal 字符串)")),
			mcp.WithString("occur_date", mcp.Description("费用发生日期(YYYY-MM-DD)")),
			mcp.WithString("description", mcp.Description("说明")),
			mcp.WithString("items", mcp.Description("明细行JSON数组(传入则整体重建明细)")),
		),
		handleOaExpenseUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_delete",
			mcp.WithDescription("删除报销单(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
		),
		handleOaExpenseDelete,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_mark_paid",
			mcp.WithDescription("标记报销单已打款(仅审批通过可标记)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
		),
		handleOaExpenseMarkPaid,
	)
}

// ── 报销 handlers ──

func handleOaExpenseList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("applicant_id", 0)),
		req.GetString("expense_type", ""),
		req.GetString("approval_status", ""),
		int8(req.GetFloat("payment_status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询报销单列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaExpenseGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	detail, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询报销单失败: %v", err))
	}
	return resultText(detail)
}

func handleOaExpenseCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	title := req.GetString("title", "")
	expenseType := req.GetString("expense_type", "")
	amount := req.GetString("amount", "")
	if title == "" || expenseType == "" || amount == "" {
		return resultError("报销标题(title)、费用类型(expense_type)、金额(amount)必填")
	}
	items, err := oaExpenseItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	createReq := &oasvc.CreateExpenseRequest{
		Title:       title,
		ApplicantID: uint(req.GetFloat("applicant_id", 0)),
		DeptID:      optUintPtr(req, "dept_id"),
		ExpenseType: expenseType,
		Amount:      amount,
		OccurDate:   req.GetString("occur_date", ""),
		Description: req.GetString("description", ""),
		Items:       items,
	}
	expense, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建报销单失败: %v", err))
	}
	return resultText(expense)
}

func handleOaExpenseUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("报销单不存在: %v", err))
	}

	// 明细:传入 items 则整体重建,否则保留现有明细(转换为输入)
	items := make([]oasvc.ExpenseItemInput, 0, len(existing.Items))
	if itemsStr := req.GetString("items", ""); itemsStr != "" {
		if err := json.Unmarshal([]byte(itemsStr), &items); err != nil {
			return resultError(fmt.Sprintf("明细 items 格式错误: %v", err))
		}
	} else {
		for _, it := range existing.Items {
			ii := oasvc.ExpenseItemInput{
				ItemType:  it.ItemType,
				Amount:    it.Amount.String(),
				InvoiceNo: it.InvoiceNo,
				Remark:    it.Remark,
			}
			if !it.OccurDate.IsZero() {
				ii.OccurDate = time.Time(it.OccurDate).Format("2006-01-02")
			}
			items = append(items, ii)
		}
	}

	// amount/occur_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateExpenseRequest{
		Title:       req.GetString("title", existing.Expense.Title),
		DeptID:      halfUintPtr(req, "dept_id", existing.Expense.DeptID),
		ExpenseType: req.GetString("expense_type", existing.Expense.ExpenseType),
		Amount:      req.GetString("amount", ""),
		OccurDate:   req.GetString("occur_date", ""),
		Description: req.GetString("description", existing.Expense.Description),
		Items:       items,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新报销单失败: %v", err))
	}
	return resultText(map[string]any{"message": "报销单已更新", "id": id})
}

func handleOaExpenseDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除报销单失败: %v", err))
	}
	return resultText(map[string]any{"message": "报销单已删除", "id": id})
}

func handleOaExpenseMarkPaid(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	if err := svc.MarkPaid(ctx, id); err != nil {
		return resultError(fmt.Sprintf("标记打款失败: %v", err))
	}
	return resultText(map[string]any{"message": "报销单已标记打款", "id": id})
}

// oaExpenseItems 解析 items JSON 字符串为报销明细输入。
func oaExpenseItems(s string) ([]oasvc.ExpenseItemInput, error) {
	if s == "" {
		return nil, nil
	}
	var items []oasvc.ExpenseItemInput
	if err := json.Unmarshal([]byte(s), &items); err != nil {
		return nil, fmt.Errorf("明细 items 格式错误: %v", err)
	}
	return items, nil
}
