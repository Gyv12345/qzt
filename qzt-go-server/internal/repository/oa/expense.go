package oa

import (
	"context"

	"gorm.io/gorm"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// expense.go OA 报销 repository。

func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// CountLike 统计 model 表中 column 列 LIKE pattern 且非空的记录数(编号规则
// 序号推算用)。model 为表对应的 model 实例,column 为服务端常量列名(非客户端输入)。
func CountLike(ctx context.Context, model any, column, pattern string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(model).
		Where(column+" LIKE ?", pattern).
		Where(column + " != ''").
		Count(&n).Error
	return n, err
}

// ExpenseRepo 报销单主表。
type ExpenseRepo struct {
	repository.BaseRepo[oamodel.OaExpense]
}

func NewExpenseRepo() *ExpenseRepo { return &ExpenseRepo{} }

// PageList 分页查询(支持申请人/类型/审批状态/打款状态过滤)。
func (r *ExpenseRepo) PageList(ctx context.Context, page, pageSize int, applicantID uint, expenseType, approvalStatus string, paymentStatus int8) ([]oamodel.OaExpense, int64, error) {
	var list []oamodel.OaExpense
	q := repoDB(ctx).Model(&oamodel.OaExpense{})
	if applicantID > 0 {
		q = q.Where("applicant_id = ?", applicantID)
	}
	if expenseType != "" {
		q = q.Where("expense_type = ?", expenseType)
	}
	if approvalStatus != "" {
		q = q.Where("approval_status = ?", approvalStatus)
	}
	if paymentStatus >= 0 {
		q = q.Where("payment_status = ?", paymentStatus)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *ExpenseRepo) Update(ctx context.Context, m *oamodel.OaExpense) error {
	return r.BaseRepo.Update(ctx, m, "Title", "ApplicantID", "DeptID", "ExpenseType", "Amount", "OccurDate", "Description", "ApprovalStatus", "PaymentStatus")
}

// ── 明细行 ──

type ExpenseItemRepo struct {
	repository.BaseRepo[oamodel.OaExpenseItem]
}

func NewExpenseItemRepo() *ExpenseItemRepo { return &ExpenseItemRepo{} }

func (r *ExpenseItemRepo) ListByExpense(ctx context.Context, expenseID uint) ([]oamodel.OaExpenseItem, error) {
	var list []oamodel.OaExpenseItem
	err := repoDB(ctx).Where("expense_id = ?", expenseID).Order("id ASC").Find(&list).Error
	return list, err
}

func (r *ExpenseItemRepo) DeleteByExpense(ctx context.Context, expenseID uint) error {
	return repoDB(ctx).Where("expense_id = ?", expenseID).Delete(&oamodel.OaExpenseItem{}).Error
}

func (r *ExpenseItemRepo) BatchCreate(ctx context.Context, items []oamodel.OaExpenseItem) error {
	if len(items) == 0 {
		return nil
	}
	return repoDB(ctx).Create(&items).Error
}
