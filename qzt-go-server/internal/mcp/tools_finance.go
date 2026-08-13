package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	finsvc "qzt-go-server/internal/module/finance/service"
)

// tools_finance.go ERP 财务 tools(会计科目/凭证/发票/往来款/利润表/资产负债表)。
// 调用 finance service:Account/Voucher/Invoice/Receivable + 报表。

func registerFinanceTools(s *server.MCPServer) {
	// ── 会计科目 ──
	s.AddTool(
		mcp.NewTool("finance_account_list",
			mcp.WithDescription("查询会计科目列表(可按类型过滤)"),
			mcp.WithString("type", mcp.Description("科目类型:ASSET(资产)/LIABILITY(负债)/EQUITY(权益)/INCOME(收入)/EXPENSE(支出)")),
		),
		handleFinanceAccountList,
	)

	s.AddTool(
		mcp.NewTool("finance_account_create",
			mcp.WithDescription("创建会计科目"),
			mcp.WithString("code", mcp.Required(), mcp.Description("科目编码")),
			mcp.WithString("name", mcp.Required(), mcp.Description("科目名称")),
			mcp.WithString("type", mcp.Required(), mcp.Description("科目类型:ASSET/LIABILITY/EQUITY/INCOME/EXPENSE")),
			mcp.WithString("balance_dir", mcp.Required(), mcp.Description("余额方向:DEBIT(借)/CREDIT(贷)")),
			mcp.WithNumber("parent_id", mcp.Description("上级科目ID(顶级不填)")),
			mcp.WithNumber("level", mcp.Description("科目层级(默认1)")),
			mcp.WithBoolean("is_leaf", mcp.Description("是否末级科目(能否记账)")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleFinanceAccountCreate,
	)

	// ── 凭证 ──
	s.AddTool(
		mcp.NewTool("finance_voucher_list",
			mcp.WithDescription("查询凭证列表(分页 + 日期/科目/状态过滤)"),
			mcp.WithString("start_date", mcp.Description("起始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("account_id", mcp.Description("科目ID")),
			mcp.WithString("status", mcp.Description("凭证状态:DRAFT(草稿)/CONFIRMED(已确认)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleFinanceVoucherList,
	)

	s.AddTool(
		mcp.NewTool("finance_voucher_create",
			mcp.WithDescription("创建凭证(自动生成凭证编号,草稿状态)"),
			mcp.WithNumber("account_id", mcp.Required(), mcp.Description("科目ID(必须末级科目)")),
			mcp.WithString("voucher_date", mcp.Required(), mcp.Description("凭证日期(YYYY-MM-DD)")),
			mcp.WithString("description", mcp.Required(), mcp.Description("摘要")),
			mcp.WithString("direction", mcp.Required(), mcp.Description("借贷方向:DEBIT(借)/CREDIT(贷)")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("金额(字符串,如 1000.00)")),
			mcp.WithString("biz_type", mcp.Description("业务类型")),
			mcp.WithNumber("biz_id", mcp.Description("业务单据ID")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleFinanceVoucherCreate,
	)

	s.AddTool(
		mcp.NewTool("finance_voucher_confirm",
			mcp.WithDescription("确认凭证(草稿 → 已确认,确认后参与报表计算)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("凭证ID")),
		),
		handleFinanceVoucherConfirm,
	)

	// ── 往来款(应收应付) ──
	s.AddTool(
		mcp.NewTool("finance_receivable_list",
			mcp.WithDescription("查询应收应付往来款列表(分页 + 多条件过滤)"),
			mcp.WithString("direction", mcp.Description("方向:RECEIVABLE(应收)/PAYABLE(应付)")),
			mcp.WithString("party_type", mcp.Description("往来方类型(如 CUSTOMER/SUPPLIER)")),
			mcp.WithNumber("party_id", mcp.Description("往来方ID")),
			mcp.WithNumber("status", mcp.Description("结算状态:1未结算 2部分结算 3已结清(不传查全部)")),
			mcp.WithString("biz_type", mcp.Description("业务类型")),
			mcp.WithString("keyword", mcp.Description("单号/往来方名称关键词")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleFinanceReceivableList,
	)

	s.AddTool(
		mcp.NewTool("finance_receivable_get",
			mcp.WithDescription("查询往来款详情(应收/应付)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("往来款ID")),
		),
		handleFinanceReceivableGet,
	)

	s.AddTool(
		mcp.NewTool("finance_receivable_create",
			mcp.WithDescription("新建应收/应付往来款(自动生成单号)"),
			mcp.WithString("direction", mcp.Required(), mcp.Description("方向:RECEIVABLE(应收)/PAYABLE(应付)")),
			mcp.WithString("party_name", mcp.Required(), mcp.Description("往来方名称")),
			mcp.WithString("occur_date", mcp.Required(), mcp.Description("发生日期(YYYY-MM-DD)")),
			mcp.WithString("original_amount", mcp.Required(), mcp.Description("原始金额(字符串,如 10000.00)")),
			mcp.WithString("party_type", mcp.Description("往来方类型(如 CUSTOMER/SUPPLIER)")),
			mcp.WithNumber("party_id", mcp.Description("往来方ID")),
			mcp.WithString("due_date", mcp.Description("到期日期(YYYY-MM-DD)")),
			mcp.WithString("biz_type", mcp.Description("业务类型")),
			mcp.WithNumber("biz_id", mcp.Description("业务单据ID")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleFinanceReceivableCreate,
	)

	s.AddTool(
		mcp.NewTool("finance_receivable_settle",
			mcp.WithDescription("结算往来款(支持部分结算,自动累计已结算金额)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("往来款ID")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("本次结算金额(字符串,必须>0)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleFinanceReceivableSettle,
	)

	// ── 发票 ──
	s.AddTool(
		mcp.NewTool("finance_invoice_list",
			mcp.WithDescription("查询发票列表(分页 + 方向/日期过滤)"),
			mcp.WithString("direction", mcp.Description("方向:RECEIVED(收到)/ISSUED(开出)")),
			mcp.WithString("start_date", mcp.Description("起始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleFinanceInvoiceList,
	)

	s.AddTool(
		mcp.NewTool("finance_invoice_create",
			mcp.WithDescription("创建发票(自动算税额和价税合计)"),
			mcp.WithString("invoice_no", mcp.Required(), mcp.Description("发票号码")),
			mcp.WithString("invoice_type", mcp.Required(), mcp.Description("发票类型(如 增值税专用发票/普通发票)")),
			mcp.WithString("direction", mcp.Required(), mcp.Description("方向:RECEIVED(收到)/ISSUED(开出)")),
			mcp.WithString("invoice_date", mcp.Required(), mcp.Description("开票日期(YYYY-MM-DD)")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("金额(不含税,字符串如 10000.00)")),
			mcp.WithString("tax_rate", mcp.Description("税率(字符串如 0.13 表示13%)")),
			mcp.WithString("party_name", mcp.Description("对方名称")),
			mcp.WithString("party_tax_no", mcp.Description("对方税号")),
			mcp.WithString("biz_type", mcp.Description("业务类型")),
			mcp.WithNumber("biz_id", mcp.Description("业务单据ID")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleFinanceInvoiceCreate,
	)

	// ── 报表 ──
	s.AddTool(
		mcp.NewTool("finance_income_statement",
			mcp.WithDescription("查询利润表(按日期范围汇总已确认凭证的收入/成本/利润)"),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("起始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束日期(YYYY-MM-DD)")),
		),
		handleFinanceIncomeStatement,
	)

	s.AddTool(
		mcp.NewTool("finance_balance_sheet",
			mcp.WithDescription("查询资产负债表(截至指定日期的资产/负债/权益合计)"),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("截止日期(YYYY-MM-DD)")),
		),
		handleFinanceBalanceSheet,
	)
}

// finUintPtr 把可选数字参数转为 *uint(0/未填返回 nil)。
func finUintPtr(v float64) *uint {
	if v <= 0 {
		return nil
	}
	u := uint(v)
	return &u
}

// ── handlers:会计科目 ──

func handleFinanceAccountList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	list, err := svc.AccountList(ctx, req.GetString("type", ""))
	if err != nil {
		return resultError(fmt.Sprintf("查询会计科目失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleFinanceAccountCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	createReq := &finsvc.CreateAccountRequest{
		Code:       req.GetString("code", ""),
		Name:       req.GetString("name", ""),
		Type:       req.GetString("type", ""),
		ParentID:   finUintPtr(req.GetFloat("parent_id", 0)),
		BalanceDir: req.GetString("balance_dir", ""),
		Level:      int(req.GetFloat("level", 0)),
		IsLeaf:     req.GetBool("is_leaf", false),
		Sort:       int(req.GetFloat("sort", 0)),
		Remark:     req.GetString("remark", ""),
	}
	if createReq.Code == "" || createReq.Name == "" || createReq.Type == "" || createReq.BalanceDir == "" {
		return resultError("code/name/type/balance_dir 必填")
	}
	acc, err := svc.CreateAccount(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建会计科目失败: %v", err))
	}
	return resultText(acc)
}

// ── handlers:凭证 ──

func handleFinanceVoucherList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.VoucherList(ctx, page, pageSize,
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
		uint(req.GetFloat("account_id", 0)),
		req.GetString("status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询凭证列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleFinanceVoucherCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	createReq := &finsvc.CreateVoucherRequest{
		AccountID:   uint(req.GetFloat("account_id", 0)),
		VoucherDate: req.GetString("voucher_date", ""),
		Description: req.GetString("description", ""),
		Direction:   req.GetString("direction", ""),
		Amount:      req.GetString("amount", ""),
		BizType:     req.GetString("biz_type", ""),
		BizID:       finUintPtr(req.GetFloat("biz_id", 0)),
		Remark:      req.GetString("remark", ""),
	}
	if createReq.AccountID == 0 || createReq.VoucherDate == "" || createReq.Description == "" ||
		createReq.Direction == "" || createReq.Amount == "" {
		return resultError("account_id/voucher_date/description/direction/amount 必填")
	}
	voucher, err := svc.CreateVoucher(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建凭证失败: %v", err))
	}
	return resultText(voucher)
}

func handleFinanceVoucherConfirm(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("凭证ID(id)必填")
	}
	if err := svc.ConfirmVoucher(ctx, id); err != nil {
		return resultError(fmt.Sprintf("确认凭证失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "message": "凭证已确认"})
}

// ── handlers:往来款 ──

func handleFinanceReceivableList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewReceivableService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("direction", ""),
		req.GetString("party_type", ""),
		uint(req.GetFloat("party_id", 0)),
		int8(req.GetFloat("status", 0)),
		req.GetString("biz_type", ""),
		req.GetString("keyword", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询往来款列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleFinanceReceivableGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewReceivableService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("往来款ID(id)必填")
	}
	rec, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询往来款失败: %v", err))
	}
	return resultText(rec)
}

func handleFinanceReceivableCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewReceivableService()
	createReq := &finsvc.CreateReceivableRequest{
		Direction:      req.GetString("direction", ""),
		PartyType:      req.GetString("party_type", ""),
		PartyID:        finUintPtr(req.GetFloat("party_id", 0)),
		PartyName:      req.GetString("party_name", ""),
		OccurDate:      req.GetString("occur_date", ""),
		DueDate:        req.GetString("due_date", ""),
		OriginalAmount: req.GetString("original_amount", ""),
		BizType:        req.GetString("biz_type", ""),
		BizID:          finUintPtr(req.GetFloat("biz_id", 0)),
		Remark:         req.GetString("remark", ""),
	}
	if createReq.Direction == "" || createReq.PartyName == "" ||
		createReq.OccurDate == "" || createReq.OriginalAmount == "" {
		return resultError("direction/party_name/occur_date/original_amount 必填")
	}
	rec, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("新建往来款失败: %v", err))
	}
	return resultText(rec)
}

func handleFinanceReceivableSettle(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewReceivableService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("往来款ID(id)必填")
	}
	settleReq := &finsvc.SettleRequest{
		Amount: req.GetString("amount", ""),
		Remark: req.GetString("remark", ""),
	}
	if settleReq.Amount == "" {
		return resultError("结算金额(amount)必填")
	}
	rec, err := svc.Settle(ctx, id, settleReq)
	if err != nil {
		return resultError(fmt.Sprintf("结算往来款失败: %v", err))
	}
	return resultText(rec)
}

// ── handlers:发票 ──

func handleFinanceInvoiceList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.InvoiceList(ctx, page, pageSize,
		req.GetString("direction", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询发票列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleFinanceInvoiceCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	createReq := &finsvc.CreateInvoiceRequest{
		InvoiceNo:   req.GetString("invoice_no", ""),
		InvoiceType: req.GetString("invoice_type", ""),
		Direction:   req.GetString("direction", ""),
		InvoiceDate: req.GetString("invoice_date", ""),
		Amount:      req.GetString("amount", ""),
		TaxRate:     req.GetString("tax_rate", ""),
		PartyName:   req.GetString("party_name", ""),
		PartyTaxNo:  req.GetString("party_tax_no", ""),
		BizType:     req.GetString("biz_type", ""),
		BizID:       finUintPtr(req.GetFloat("biz_id", 0)),
		Remark:      req.GetString("remark", ""),
	}
	if createReq.InvoiceNo == "" || createReq.InvoiceType == "" ||
		createReq.Direction == "" || createReq.InvoiceDate == "" || createReq.Amount == "" {
		return resultError("invoice_no/invoice_type/direction/invoice_date/amount 必填")
	}
	inv, err := svc.CreateInvoice(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建发票失败: %v", err))
	}
	return resultText(inv)
}

// ── handlers:报表 ──

func handleFinanceIncomeStatement(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if startDate == "" || endDate == "" {
		return resultError("start_date/end_date 必填")
	}
	data, err := svc.IncomeStatement(ctx, startDate, endDate)
	if err != nil {
		return resultError(fmt.Sprintf("查询利润表失败: %v", err))
	}
	return resultText(data)
}

func handleFinanceBalanceSheet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := finsvc.NewFinanceService()
	endDate := req.GetString("end_date", "")
	if endDate == "" {
		return resultError("end_date 必填")
	}
	data, err := svc.BalanceSheet(ctx, endDate)
	if err != nil {
		return resultError(fmt.Sprintf("查询资产负债表失败: %v", err))
	}
	return resultText(data)
}
