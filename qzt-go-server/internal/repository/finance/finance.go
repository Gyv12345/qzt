package finance

import (
	"context"

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

func (r *AccountRepo) Update(ctx context.Context, m *finmodel.FinAccount) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Type", "ParentID", "BalanceDir", "Level", "IsLeaf", "Status", "Sort", "Remark")
}

// ── 凭证 ──

type VoucherRepo struct {
	repository.BaseRepo[finmodel.FinVoucher]
}

func NewVoucherRepo() *VoucherRepo { return &VoucherRepo{} }

func (r *VoucherRepo) Update(ctx context.Context, m *finmodel.FinVoucher) error {
	return r.BaseRepo.Update(ctx, m, "VoucherDate", "AccountID", "Description", "Direction", "Amount", "Currency", "BizType", "BizID", "Status", "OperatorID", "Remark")
}

// ── 发票 ──

type InvoiceRepo struct {
	repository.BaseRepo[finmodel.FinInvoice]
}

func NewInvoiceRepo() *InvoiceRepo { return &InvoiceRepo{} }

func (r *InvoiceRepo) Update(ctx context.Context, m *finmodel.FinInvoice) error {
	return r.BaseRepo.Update(ctx, m, "InvoiceType", "Direction", "InvoiceDate", "Amount", "TaxRate", "TaxAmount", "TotalAmount", "PartyName", "PartyTaxNo", "BizType", "BizID", "Remark")
}
