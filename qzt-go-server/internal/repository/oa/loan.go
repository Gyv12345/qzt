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

func (r *LoanRepo) PageList(ctx context.Context, page, pageSize int, applicantID uint, loanType, approvalStatus string, repaidStatus int8) ([]oamodel.OaLoan, int64, error) {
	var list []oamodel.OaLoan
	q := repository.DBFrom(ctx).Model(&oamodel.OaLoan{})
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
