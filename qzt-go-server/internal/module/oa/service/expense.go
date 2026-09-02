package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xtime"
)

// expense.go 报销单服务。

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

// validateExpenseItems 校验明细行:至少一行、每行金额必须大于 0(防 0 元/负数明细冲抵)。
func validateExpenseItems(items []ExpenseItemInput) error {
	if len(items) == 0 {
		return errors.New("请至少添加一行费用明细")
	}
	for i, it := range items {
		amt, err := decimal.NewFromString(it.Amount)
		if err != nil {
			return fmt.Errorf("第%d行明细金额格式错误", i+1)
		}
		if !amt.IsPositive() {
			return fmt.Errorf("第%d行明细金额必须大于0", i+1)
		}
	}
	return nil
}

// Create 新建报销单(含明细行)。
func (s *ExpenseService) Create(ctx context.Context, req *CreateExpenseRequest, userID uint) (*oamodel.OaExpense, error) {
	if req.ApplicantID == 0 {
		req.ApplicantID = userID
	}
	if err := validateExpenseItems(req.Items); err != nil {
		return nil, err
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, errors.New("金额格式错误")
	}
	if !amount.IsPositive() {
		return nil, errors.New("报销总金额必须大于0")
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
func (s *ExpenseService) List(ctx context.Context, page, pageSize int, applicantID uint, expenseNo, title, expenseType, approvalStatus string, paymentStatus int8) ([]oamodel.OaExpense, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, applicantID, expenseNo, title, expenseType, approvalStatus, paymentStatus)
}

// GetByID 报销单详情(含明细行)。
func (s *ExpenseService) GetByID(ctx context.Context, id uint) (*oamodel.ExpenseDetail, error) {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "报销单不存在")
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
		return repository.NotFoundOr(err, "报销单不存在")
	}
	if !oamodel.CanEditApproval(expense.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的报销单可编辑")
	}
	if err := validateExpenseItems(req.Items); err != nil {
		return err
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
		if !amount.IsPositive() {
			return errors.New("报销总金额必须大于0")
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
		return repository.NotFoundOr(err, "报销单不存在")
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
		return repository.NotFoundOr(err, "报销单不存在")
	}
	if expense.ApprovalStatus != oamodel.ApprovalStatusApproved {
		return errors.New("仅审批通过的报销单可标记打款")
	}
	expense.PaymentStatus = oamodel.PaymentStatusPaid
	return s.repo.Update(ctx, expense)
}
