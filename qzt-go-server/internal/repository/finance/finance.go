package finance

import (
	"context"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	finmodel "qzt-go-server/internal/model/finance"
	"qzt-go-server/internal/repository"
)

// finance.go 财务 repository。

func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// ── 科目 ──

type AccountRepo struct {
	repository.BaseRepo[finmodel.FinAccount]
}

func NewAccountRepo() *AccountRepo { return &AccountRepo{} }

// ListByType 按科目类型查询。
func (r *AccountRepo) ListByType(ctx context.Context, accType string) ([]finmodel.FinAccount, error) {
	var list []finmodel.FinAccount
	q := repoDB(ctx).Where("status = 1")
	if accType != "" {
		q = q.Where("type = ?", accType)
	}
	err := q.Order("code ASC").Find(&list).Error
	return list, err
}

// FirstActiveByType 按类型取第一个启用科目(code 最小)。审批回调生成借款凭证时的兜底科目。
func (r *AccountRepo) FirstActiveByType(ctx context.Context, accType string) (*finmodel.FinAccount, error) {
	var account finmodel.FinAccount
	err := repoDB(ctx).Where("type = ? AND status = 1", accType).
		Order("code ASC").First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// FirstLeafByType 按类型取第一个启用的末级科目(id 最小)。回款凭证兜底科目用。
func (r *AccountRepo) FirstLeafByType(ctx context.Context, accType string) (*finmodel.FinAccount, error) {
	var acc finmodel.FinAccount
	err := repoDB(ctx).Where("type = ? AND is_leaf = 1 AND status = 1", accType).
		Order("id ASC").First(&acc).Error
	if err != nil {
		return nil, err
	}
	return &acc, nil
}

func (r *AccountRepo) Update(ctx context.Context, m *finmodel.FinAccount) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Type", "ParentID", "BalanceDir", "Level", "IsLeaf", "Status", "Sort", "Remark")
}

// ── 凭证 ──

type VoucherRepo struct {
	repository.BaseRepo[finmodel.FinVoucher]
}

func NewVoucherRepo() *VoucherRepo { return &VoucherRepo{} }

// CountByBiz 统计某业务单据已生成的凭证数(自动生成凭证的幂等去重用)。
func (r *VoucherRepo) CountByBiz(ctx context.Context, bizType string, bizID uint) (int64, error) {
	var count int64
	err := repoDB(ctx).Model(&finmodel.FinVoucher{}).
		Where("biz_type = ? AND biz_id = ?", bizType, bizID).
		Count(&count).Error
	return count, err
}

func (r *VoucherRepo) Update(ctx context.Context, m *finmodel.FinVoucher) error {
	return r.BaseRepo.Update(ctx, m, "VoucherDate", "AccountID", "Description", "Direction", "Amount", "Currency", "BizType", "BizID", "Status", "OperatorID", "Remark")
}

// CountByNoPrefix 统计同前缀凭证数(凭证编号 VyyyyMMdd-序号 的序号推算用)。
func (r *VoucherRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var count int64
	err := repoDB(ctx).Model(&finmodel.FinVoucher{}).Where("voucher_no LIKE ?", prefix+"%").Count(&count).Error
	return count, err
}

// PageList 凭证分页(日期/科目/状态可选过滤,id DESC)。
func (r *VoucherRepo) PageList(ctx context.Context, page, pageSize int, startDate, endDate string, accountID uint, status string) ([]finmodel.FinVoucher, int64, error) {
	var list []finmodel.FinVoucher
	q := repoDB(ctx).Model(&finmodel.FinVoucher{})
	if startDate != "" {
		q = q.Where("DATE(voucher_date) >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("DATE(voucher_date) <= ?", endDate)
	}
	if accountID > 0 {
		q = q.Where("account_id = ?", accountID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// SumConfirmedByAccount 汇总已确认凭证金额(JOIN fin_account 按科目类型 + 借贷方向
// 过滤),利润表/资产负债表用。startDate/endDate 为 yyyy-MM-dd,可空。
func (r *VoucherRepo) SumConfirmedByAccount(ctx context.Context, startDate, endDate, accType, direction string) (decimal.Decimal, error) {
	var amount decimal.Decimal
	db := repoDB(ctx).Table("fin_voucher").Where("status = ?", finmodel.VoucherStatusConfirmed)
	if startDate != "" {
		db = db.Where("DATE(voucher_date) >= ?", startDate)
	}
	if endDate != "" {
		db = db.Where("DATE(voucher_date) <= ?", endDate)
	}
	err := db.Joins("JOIN fin_account ON fin_account.id = fin_voucher.account_id").
		Where("fin_account.type = ? AND fin_voucher.direction = ?", accType, direction).
		Select("COALESCE(SUM(fin_voucher.amount),0)").Scan(&amount).Error
	return amount, err
}

// ── 发票 ──

type InvoiceRepo struct {
	repository.BaseRepo[finmodel.FinInvoice]
}

func NewInvoiceRepo() *InvoiceRepo { return &InvoiceRepo{} }

func (r *InvoiceRepo) Update(ctx context.Context, m *finmodel.FinInvoice) error {
	return r.BaseRepo.Update(ctx, m, "InvoiceType", "Direction", "InvoiceDate", "Amount", "TaxRate", "TaxAmount", "TotalAmount", "PartyName", "PartyTaxNo", "BizType", "BizID", "Remark")
}

// PageList 发票分页(方向/日期可选过滤,id DESC)。
func (r *InvoiceRepo) PageList(ctx context.Context, page, pageSize int, direction, startDate, endDate string) ([]finmodel.FinInvoice, int64, error) {
	var list []finmodel.FinInvoice
	q := repoDB(ctx).Model(&finmodel.FinInvoice{})
	if direction != "" {
		q = q.Where("direction = ?", direction)
	}
	if startDate != "" {
		q = q.Where("DATE(invoice_date) >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("DATE(invoice_date) <= ?", endDate)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}
