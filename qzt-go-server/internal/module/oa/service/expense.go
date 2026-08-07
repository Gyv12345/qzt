package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// expense.go 报销单服务。

func notFoundOr(err error, msg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(msg)
	}
	return err
}

// ExpenseService 报销单服务。
type ExpenseService struct {
	repo     *oarepo.ExpenseRepo
	itemRepo *oarepo.ExpenseItemRepo
}

func NewExpenseService() *ExpenseService {
	return &ExpenseService{repo: oarepo.NewExpenseRepo(), itemRepo: oarepo.NewExpenseItemRepo()}
}

// CreateExpenseRequest 新建报销单。
type CreateExpenseRequest struct {
	Title       string             `json:"title" binding:"required"`
	ApplicantID uint               `json:"applicant_id"`
	DeptID      *uint              `json:"dept_id"`
	ExpenseType string             `json:"expense_type" binding:"required"`
	Amount      string             `json:"amount" binding:"required"`
	OccurDate   string             `json:"occur_date"`
	Description string             `json:"description"`
	Items       []ExpenseItemInput `json:"items"`
}

// ExpenseItemInput 明细行输入。
type ExpenseItemInput struct {
	ItemType  string `json:"item_type"`
	Amount    string `json:"amount" binding:"required"`
	OccurDate string `json:"occur_date"`
	InvoiceNo string `json:"invoice_no"`
	Remark    string `json:"remark"`
}

// Create 新建报销单(含明细行)。
func (s *ExpenseService) Create(ctx context.Context, req *CreateExpenseRequest, userID uint) (*oamodel.OaExpense, error) {
	if req.ApplicantID == 0 {
		req.ApplicantID = userID
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, errors.New("金额格式错误")
	}
	expenseNo, _ := numbergen.Generate(ctx, "expense")

	occurDate := xtime.DateTime{}
	if req.OccurDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.OccurDate, time.Local); err == nil {
			occurDate = xtime.NewDateTime(t)
		}
	}

	expense := &oamodel.OaExpense{
		ExpenseNo:      expenseNo,
		Title:          req.Title,
		ApplicantID:    req.ApplicantID,
		DeptID:         req.DeptID,
		ExpenseType:    req.ExpenseType,
		Amount:         amount,
		OccurDate:      occurDate,
		Description:    req.Description,
		ApprovalStatus: oamodel.ApprovalStatusNone,
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, expense); err != nil {
			return err
		}
		items := make([]oamodel.OaExpenseItem, 0, len(req.Items))
		for _, it := range req.Items {
			amt, e := decimal.NewFromString(it.Amount)
			if e != nil {
				return fmt.Errorf("明细金额格式错误: %v", e)
			}
			item := oamodel.OaExpenseItem{
				ExpenseID: expense.ID,
				ItemType:  it.ItemType,
				Amount:    amt,
				InvoiceNo: it.InvoiceNo,
				Remark:    it.Remark,
			}
			if it.OccurDate != "" {
				if t, e := time.ParseInLocation("2006-01-02", it.OccurDate, time.Local); e == nil {
					item.OccurDate = xtime.NewNullDateTimeFromTime(t)
				}
			}
			items = append(items, item)
		}
		return s.itemRepo.BatchCreate(ctx, items)
	})
	if err != nil {
		return nil, err
	}
	return expense, nil
}

// List 报销单列表(分页)。
func (s *ExpenseService) List(ctx context.Context, page, pageSize int, applicantID uint, expenseType, approvalStatus string, paymentStatus int8) ([]oamodel.OaExpense, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, applicantID, expenseType, approvalStatus, paymentStatus)
}

// GetByID 报销单详情(含明细行)。
func (s *ExpenseService) GetByID(ctx context.Context, id uint) (*oamodel.ExpenseDetail, error) {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "报销单不存在")
	}
	items, err := s.itemRepo.ListByExpense(ctx, id)
	if err != nil {
		return nil, err
	}
	return &oamodel.ExpenseDetail{Expense: *expense, Items: items}, nil
}

// UpdateExpenseRequest 编辑报销单(仅 NONE/REJECTED 状态可改)。
type UpdateExpenseRequest struct {
	Title       string             `json:"title" binding:"required"`
	DeptID      *uint              `json:"dept_id"`
	ExpenseType string             `json:"expense_type"`
	Amount      string             `json:"amount"`
	OccurDate   string             `json:"occur_date"`
	Description string             `json:"description"`
	Items       []ExpenseItemInput `json:"items"`
}

// Update 编辑报销单(含明细行重建)。
func (s *ExpenseService) Update(ctx context.Context, id uint, req *UpdateExpenseRequest) error {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "报销单不存在")
	}
	if expense.ApprovalStatus != oamodel.ApprovalStatusNone && expense.ApprovalStatus != oamodel.ApprovalStatusRejected {
		return errors.New("仅未提交或已驳回的报销单可编辑")
	}

	if req.ExpenseType != "" {
		expense.ExpenseType = req.ExpenseType
	}
	expense.Title = req.Title
	expense.DeptID = req.DeptID
	expense.Description = req.Description
	if req.Amount != "" {
		amount, err := decimal.NewFromString(req.Amount)
		if err != nil {
			return errors.New("金额格式错误")
		}
		expense.Amount = amount
	}
	if req.OccurDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.OccurDate, time.Local); err == nil {
			expense.OccurDate = xtime.NewDateTime(t)
		}
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, expense); err != nil {
			return err
		}
		// 重建明细行:先删后建
		if err := s.itemRepo.DeleteByExpense(ctx, id); err != nil {
			return err
		}
		items := make([]oamodel.OaExpenseItem, 0, len(req.Items))
		for _, it := range req.Items {
			amt, e := decimal.NewFromString(it.Amount)
			if e != nil {
				continue
			}
			item := oamodel.OaExpenseItem{
				ExpenseID: id,
				ItemType:  it.ItemType,
				Amount:    amt,
				InvoiceNo: it.InvoiceNo,
				Remark:    it.Remark,
			}
			if it.OccurDate != "" {
				if t, e := time.ParseInLocation("2006-01-02", it.OccurDate, time.Local); e == nil {
					item.OccurDate = xtime.NewNullDateTimeFromTime(t)
				}
			}
			items = append(items, item)
		}
		return s.itemRepo.BatchCreate(ctx, items)
	})
}

// Delete 删除报销单(仅 NONE 状态)。
func (s *ExpenseService) Delete(ctx context.Context, id uint) error {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "报销单不存在")
	}
	if expense.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的报销单可删除")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.itemRepo.DeleteByExpense(ctx, id); err != nil {
			return err
		}
		return s.repo.Delete(ctx, id)
	})
}

// MarkPaid 标记已打款。
func (s *ExpenseService) MarkPaid(ctx context.Context, id uint) error {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "报销单不存在")
	}
	if expense.ApprovalStatus != oamodel.ApprovalStatusApproved {
		return errors.New("仅审批通过的报销单可标记打款")
	}
	expense.PaymentStatus = oamodel.PaymentStatusPaid
	return s.repo.Update(ctx, expense)
}
