package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	finmodel "qzt-go-server/internal/model/finance"
	finrepo "qzt-go-server/internal/repository/finance"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// finance.go 财务服务:科目 + 凭证 + 发票 + 报表(利润表/资产负债表)。

// FinanceService 财务服务。
type FinanceService struct {
	accountRepo *finrepo.AccountRepo
	voucherRepo *finrepo.VoucherRepo
	invoiceRepo *finrepo.InvoiceRepo
}

func NewFinanceService() *FinanceService {
	return &FinanceService{
		accountRepo: finrepo.NewAccountRepo(),
		voucherRepo: finrepo.NewVoucherRepo(),
		invoiceRepo: finrepo.NewInvoiceRepo(),
	}
}

// ── 科目 ──

// AccountList 科目列表(可按类型过滤)。
func (s *FinanceService) AccountList(ctx context.Context, accType string) ([]finmodel.FinAccount, error) {
	return s.accountRepo.ListByType(ctx, accType)
}

// CreateAccountRequest 创建科目。
type CreateAccountRequest struct {
	Code       string `json:"code" binding:"required"`
	Name       string `json:"name" binding:"required"`
	Type       string `json:"type" binding:"required"`
	ParentID   *uint  `json:"parent_id"`
	BalanceDir string `json:"balance_dir" binding:"required"`
	Level      int    `json:"level"`
	IsLeaf     bool   `json:"is_leaf"`
	Sort       int    `json:"sort"`
	Remark     string `json:"remark"`
}

// CreateAccount 创建科目。
func (s *FinanceService) CreateAccount(ctx context.Context, req *CreateAccountRequest) (*finmodel.FinAccount, error) {
	acc := &finmodel.FinAccount{
		Code: req.Code, Name: req.Name, Type: req.Type, ParentID: req.ParentID,
		BalanceDir: req.BalanceDir, Level: req.Level, IsLeaf: req.IsLeaf,
		Status: 1, Sort: req.Sort, Remark: req.Remark,
	}
	if acc.Level == 0 {
		acc.Level = 1
	}
	if err := s.accountRepo.Create(ctx, acc); err != nil {
		return nil, err
	}
	return acc, nil
}

// ── 凭证 ──

// CreateVoucherRequest 创建凭证。
type CreateVoucherRequest struct {
	AccountID   uint   `json:"account_id" binding:"required"`
	VoucherDate string `json:"voucher_date" binding:"required"` // yyyy-MM-dd
	Description string `json:"description" binding:"required"`
	Direction   string `json:"direction" binding:"required"` // DEBIT/CREDIT
	Amount      string `json:"amount" binding:"required"`
	BizType     string `json:"biz_type"`
	BizID       *uint  `json:"biz_id"`
	Remark      string `json:"remark"`
}

// CreateVoucher 创建凭证(自动生成凭证编号 V yyyyMMdd-序号)。
func (s *FinanceService) CreateVoucher(ctx context.Context, req *CreateVoucherRequest, operatorID uint) (*finmodel.FinVoucher, error) {
	// 校验科目
	acc, err := s.accountRepo.GetByID(ctx, req.AccountID)
	if err != nil {
		return nil, errors.New("科目不存在")
	}
	if !acc.IsLeaf {
		return nil, errors.New("只能向末级科目记账")
	}

	voucherDate, err := time.ParseInLocation("2006-01-02", req.VoucherDate, time.Local)
	if err != nil {
		return nil, errors.New("voucher_date 格式错误,应为 yyyy-MM-dd")
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, errors.New("amount 格式错误")
	}
	if req.Direction != finmodel.BalanceDirDebit && req.Direction != finmodel.BalanceDirCredit {
		return nil, errors.New("direction 只能是 DEBIT 或 CREDIT")
	}

	// 生成凭证编号
	voucherNo := s.generateVoucherNo(ctx, voucherDate)

	voucher := &finmodel.FinVoucher{
		VoucherNo:   voucherNo,
		VoucherDate: xtime.NewDateTime(voucherDate),
		AccountID:   req.AccountID,
		Description: req.Description,
		Direction:   req.Direction,
		Amount:      amount,
		BizType:     req.BizType,
		BizID:       req.BizID,
		Status:      finmodel.VoucherStatusDraft,
		OperatorID:  &operatorID,
		Remark:      req.Remark,
	}
	if err := s.voucherRepo.Create(ctx, voucher); err != nil {
		return nil, err
	}
	return voucher, nil
}

// generateVoucherNo 生成凭证编号(格式 V20260804-001)。
func (s *FinanceService) generateVoucherNo(ctx context.Context, date time.Time) string {
	prefix := fmt.Sprintf("V%s", date.Format("20060102"))
	var count int64
	repository.DBFrom(ctx).Model(&finmodel.FinVoucher{}).Where("voucher_no LIKE ?", prefix+"%").Count(&count)
	return fmt.Sprintf("%s-%03d", prefix, count+1)
}

// VoucherList 凭证列表(分页 + 日期/科目/状态过滤)。
func (s *FinanceService) VoucherList(ctx context.Context, page, pageSize int, startDate, endDate string, accountID uint, status string) ([]finmodel.FinVoucher, int64, error) {
	db := repository.DBFrom(ctx).Model(&finmodel.FinVoucher{})
	if startDate != "" {
		db = db.Where("DATE(voucher_date) >= ?", startDate)
	}
	if endDate != "" {
		db = db.Where("DATE(voucher_date) <= ?", endDate)
	}
	if accountID > 0 {
		db = db.Where("account_id = ?", accountID)
	}
	if status != "" {
		db = db.Where("status = ?", status)
	}
	var total int64
	db.Count(&total)
	var list []finmodel.FinVoucher
	err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ConfirmVoucher 确认凭证(DRAFT → CONFIRMED)。
func (s *FinanceService) ConfirmVoucher(ctx context.Context, id uint) error {
	v, err := s.voucherRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("凭证不存在")
	}
	if v.Status != finmodel.VoucherStatusDraft {
		return errors.New("仅草稿状态可确认")
	}
	v.Status = finmodel.VoucherStatusConfirmed
	return s.voucherRepo.Update(ctx, v)
}

// ── 发票 ──

// CreateInvoiceRequest 创建发票。
type CreateInvoiceRequest struct {
	InvoiceNo   string `json:"invoice_no" binding:"required"`
	InvoiceType string `json:"invoice_type" binding:"required"`
	Direction   string `json:"direction" binding:"required"` // RECEIVED/ISSUED
	InvoiceDate string `json:"invoice_date" binding:"required"`
	Amount      string `json:"amount" binding:"required"`
	TaxRate     string `json:"tax_rate"`
	PartyName   string `json:"party_name"`
	PartyTaxNo  string `json:"party_tax_no"`
	BizType     string `json:"biz_type"`
	BizID       *uint  `json:"biz_id"`
	Remark      string `json:"remark"`
}

// CreateInvoice 创建发票(自动算税额和价税合计)。
func (s *FinanceService) CreateInvoice(ctx context.Context, req *CreateInvoiceRequest) (*finmodel.FinInvoice, error) {
	date, err := time.ParseInLocation("2006-01-02", req.InvoiceDate, time.Local)
	if err != nil {
		return nil, errors.New("invoice_date 格式错误")
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, errors.New("amount 格式错误")
	}
	taxRate, _ := decimal.NewFromString(req.TaxRate)
	taxAmount := amount.Mul(taxRate).Round(2)
	total := amount.Add(taxAmount)

	inv := &finmodel.FinInvoice{
		InvoiceNo:   req.InvoiceNo,
		InvoiceType: req.InvoiceType,
		Direction:   req.Direction,
		InvoiceDate: xtime.NewDateTime(date),
		Amount:      amount,
		TaxRate:     taxRate,
		TaxAmount:   taxAmount,
		TotalAmount: total,
		PartyName:   req.PartyName,
		PartyTaxNo:  req.PartyTaxNo,
		BizType:     req.BizType,
		BizID:       req.BizID,
		Remark:      req.Remark,
	}
	if err := s.invoiceRepo.Create(ctx, inv); err != nil {
		return nil, err
	}
	return inv, nil
}

// InvoiceList 发票列表(分页 + 方向/日期过滤)。
func (s *FinanceService) InvoiceList(ctx context.Context, page, pageSize int, direction, startDate, endDate string) ([]finmodel.FinInvoice, int64, error) {
	db := repository.DBFrom(ctx).Model(&finmodel.FinInvoice{})
	if direction != "" {
		db = db.Where("direction = ?", direction)
	}
	if startDate != "" {
		db = db.Where("DATE(invoice_date) >= ?", startDate)
	}
	if endDate != "" {
		db = db.Where("DATE(invoice_date) <= ?", endDate)
	}
	var total int64
	db.Count(&total)
	var list []finmodel.FinInvoice
	err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ── 报表 ──

// IncomeStatement 利润表(简化的损益汇总)。
type IncomeStatement struct {
	Revenue        decimal.Decimal `json:"revenue"`         // 营业收入(INCOME 贷方合计)
	COGS           decimal.Decimal `json:"cogs"`            // 营业成本(EXPENSE 借方合计)
	GrossProfit    decimal.Decimal `json:"gross_profit"`    // 毛利润 = 收入 - 成本
	NetProfit      decimal.Decimal `json:"net_profit"`      // 净利润
}

// IncomeStatement 利润表(按日期范围)。
func (s *FinanceService) IncomeStatement(ctx context.Context, startDate, endDate string) (*IncomeStatement, error) {
	data := &IncomeStatement{}
	db := repository.DBFrom(ctx).Table("fin_voucher").Where("status = ?", finmodel.VoucherStatusConfirmed)
	db = applyDateRange(db, "voucher_date", startDate, endDate)

	// 收入 = INCOME 科目贷方合计
	var revenue decimal.Decimal
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeIncome, finmodel.BalanceDirCredit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&revenue)
	data.Revenue = revenue

	// 支出 = EXPENSE 科目借方合计
	var expense decimal.Decimal
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeExpense, finmodel.BalanceDirDebit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&expense)
	data.COGS = expense
	data.GrossProfit = revenue.Sub(expense)
	data.NetProfit = data.GrossProfit
	return data, nil
}

// BalanceSheet 资产负债表(简化)。
type BalanceSheet struct {
	TotalAssets      decimal.Decimal `json:"total_assets"`      // 资产合计
	TotalLiabilities decimal.Decimal `json:"total_liabilities"` // 负债合计
	TotalEquity      decimal.Decimal `json:"total_equity"`      // 权益合计
}

// BalanceSheet 资产负债表(截至 endDate)。
func (s *FinanceService) BalanceSheet(ctx context.Context, endDate string) (*BalanceSheet, error) {
	data := &BalanceSheet{}
	db := repository.DBFrom(ctx).Table("fin_voucher").Where("status = ?", finmodel.VoucherStatusConfirmed)
	db = applyDateRange(db, "voucher_date", "", endDate)

	// 资产 = ASSET 科目借方 - 贷方
	var assetDebit, assetCredit decimal.Decimal
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeAsset, finmodel.BalanceDirDebit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&assetDebit)
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeAsset, finmodel.BalanceDirCredit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&assetCredit)
	data.TotalAssets = assetDebit.Sub(assetCredit)

	// 负债 = LIABILITY 科目贷方 - 借方
	var liabDebit, liabCredit decimal.Decimal
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeLiability, finmodel.BalanceDirDebit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&liabDebit)
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeLiability, finmodel.BalanceDirCredit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&liabCredit)
	data.TotalLiabilities = liabCredit.Sub(liabDebit)

	// 权益 = EQUITY 科目贷方 - 借方
	var eqDebit, eqCredit decimal.Decimal
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeEquity, finmodel.BalanceDirDebit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&eqDebit)
	db.Session(&gorm.Session{}).Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", finmodel.AccountTypeEquity, finmodel.BalanceDirCredit).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&eqCredit)
	data.TotalEquity = eqCredit.Sub(eqDebit)
	return data, nil
}

// applyDateRange 日期范围过滤。
func applyDateRange(db *gorm.DB, col, start, end string) *gorm.DB {
	if start != "" {
		db = db.Where("DATE("+col+") >= ?", start)
	}
	if end != "" {
		db = db.Where("DATE("+col+") <= ?", end)
	}
	return db
}
