package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// loan.go OA 备用金 repository。

type LoanRepo struct {
	repository.BaseRepo[oamodel.OaLoan]
}

func NewLoanRepo() *LoanRepo { return &LoanRepo{} }

func (r *LoanRepo) PageList(ctx context.Context, page, pageSize int, applicantID uint, loanNo, title, loanType, approvalStatus string, repaidStatus int8) ([]oamodel.OaLoan, int64, error) {
	var list []oamodel.OaLoan
	q := repository.DBFrom(ctx).Model(&oamodel.OaLoan{})
	if loanNo != "" {
		q = q.Where("loan_no LIKE ?", "%"+loanNo+"%")
	}
	if title != "" {
		q = q.Where("title LIKE ?", "%"+title+"%")
	}
	if applicantID > 0 {
		q = q.Where("applicant_id = ?", applicantID)
	}
	if loanType != "" {
		q = q.Where("loan_type = ?", loanType)
	}
	if approvalStatus != "" {
		q = q.Where("approval_status = ?", approvalStatus)
	}
	if repaidStatus >= 0 {
		q = q.Where("repaid_status = ?", repaidStatus)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *LoanRepo) Update(ctx context.Context, m *oamodel.OaLoan) error {
	return r.BaseRepo.Update(ctx, m, "Title", "ApplicantID", "DeptID", "LoanType", "Amount", "ExpectedDate", "Reason", "ApprovalStatus", "RepaidStatus", "RepaidAmount")
}

// LoanVoucherSource 借款凭证生成所需的三列。
type LoanVoucherSource struct {
	LoanNo      string
	ApplicantID uint
	Amount      string
}

// GetVoucherSource 按借款 ID 取凭证生成所需字段(审批通过自动生成财务凭证用)。
func (r *LoanRepo) GetVoucherSource(ctx context.Context, id uint) (LoanVoucherSource, error) {
	var loan LoanVoucherSource
	err := repoDB(ctx).Table("oa_loan").
		Select("loan_no, applicant_id, amount").
		Where("id = ?", id).
		Scan(&loan).Error
	return loan, err
}
