package service

import (
	"context"
	"errors"
	"time"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xtime"
)

// loan.go 备用金/借款服务。

type LoanService struct {
	repo *oarepo.LoanRepo
}

func NewLoanService() *LoanService { return &LoanService{repo: oarepo.NewLoanRepo()} }

type CreateLoanRequest struct {
	Title        string `json:"title" binding:"required"`
	ApplicantID  uint   `json:"applicant_id"`
	DeptID       *uint  `json:"dept_id"`
	LoanType     string `json:"loan_type" binding:"required"`
	Amount       string `json:"amount" binding:"required"`
	ExpectedDate string `json:"expected_date"`
	Reason       string `json:"reason"`
}

func (s *LoanService) Create(ctx context.Context, req *CreateLoanRequest, userID uint) (*oamodel.OaLoan, error) {
	if req.ApplicantID == 0 {
		req.ApplicantID = userID
	}
	loanNo, _ := numbergen.Generate(ctx, "loan")

	var expectedDate xtime.DateTime
	if req.ExpectedDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.ExpectedDate, time.Local); err == nil {
			expectedDate = xtime.NewDateTime(t)
		}
	}

	loan := &oamodel.OaLoan{
		LoanNo:         loanNo,
		Title:          req.Title,
		ApplicantID:    req.ApplicantID,
		DeptID:         req.DeptID,
		LoanType:       req.LoanType,
		Amount:         req.Amount,
		ExpectedDate:   expectedDate,
		Reason:         req.Reason,
		ApprovalStatus: oamodel.ApprovalStatusNone,
		RepaidStatus:   oamodel.LoanRepaidStatusUnpaid,
		RepaidAmount:   "0",
	}
	if err := s.repo.Create(ctx, loan); err != nil {
		return nil, err
	}
	return loan, nil
}

func (s *LoanService) List(ctx context.Context, page, pageSize int, applicantID uint, loanNo, title, loanType, approvalStatus string, repaidStatus int8) ([]oamodel.OaLoan, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, applicantID, loanNo, title, loanType, approvalStatus, repaidStatus)
}

func (s *LoanService) GetByID(ctx context.Context, id uint) (*oamodel.OaLoan, error) {
	loan, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "借款单不存在")
	}
	return loan, nil
}

type UpdateLoanRequest struct {
	Title        string `json:"title" binding:"required"`
	DeptID       *uint  `json:"dept_id"`
	LoanType     string `json:"loan_type"`
	Amount       string `json:"amount"`
	ExpectedDate string `json:"expected_date"`
	Reason       string `json:"reason"`
}

func (s *LoanService) Update(ctx context.Context, id uint, req *UpdateLoanRequest) error {
	loan, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "借款单不存在")
	}
	if !oamodel.CanEditApproval(loan.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的借款单可编辑")
	}
	loan.Title = req.Title
	loan.DeptID = req.DeptID
	if req.LoanType != "" {
		loan.LoanType = req.LoanType
	}
	if req.Amount != "" {
		loan.Amount = req.Amount
	}
	loan.Reason = req.Reason
	if req.ExpectedDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.ExpectedDate, time.Local); err == nil {
			loan.ExpectedDate = xtime.NewDateTime(t)
		}
	}
	return s.repo.Update(ctx, loan)
}

func (s *LoanService) Delete(ctx context.Context, id uint) error {
	loan, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "借款单不存在")
	}
	if loan.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的借款单可删除")
	}
	return s.repo.Delete(ctx, id)
}

// MarkRepaid 标记已还款(全额)。
func (s *LoanService) MarkRepaid(ctx context.Context, id uint) error {
	loan, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "借款单不存在")
	}
	if loan.ApprovalStatus != oamodel.ApprovalStatusApproved {
		return errors.New("仅审批通过的借款单可标记还款")
	}
	loan.RepaidStatus = oamodel.LoanRepaidStatusPaid
	loan.RepaidAmount = loan.Amount
	return s.repo.Update(ctx, loan)
}
