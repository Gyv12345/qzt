package psi

import (
	"context"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// purchase.go 采购订单 + 采购退货 repository。

// PurchaseOrderRepo 采购订单。
type PurchaseOrderRepo struct {
	repository.BaseRepo[psimodel.PsiPurchaseOrder]
}

func NewPurchaseOrderRepo() *PurchaseOrderRepo { return &PurchaseOrderRepo{} }

// SummaryRow 采购汇总行(按日)。
type SummaryRow struct {
	Date   string          `json:"date"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// SummaryByDate 按日聚合已入库采购单的笔数与金额(报表用)。
// startDate/endDate 支持 yyyy-MM-dd HH:mm:ss 或 yyyy-MM-dd,解析失败则忽略该边界。
func (r *PurchaseOrderRepo) SummaryByDate(ctx context.Context, startDate, endDate string) ([]SummaryRow, error) {
	db := repository.DBFrom(ctx).Table("psi_purchase_order").
		Select("DATE(order_date) AS date, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS amount").
		Group("DATE(order_date)").
		Order("date ASC")
	if t := parseReportTime(startDate); t != nil {
		db = db.Where("order_date >= ?", t)
	}
	if t := parseReportTime(endDate); t != nil {
		db = db.Where("order_date <= ?", t)
	}
	db = db.Where("status = ?", psimodel.PurchaseStatusReceipt)
	var rows []SummaryRow
	if err := db.Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

// GetByID 含明细的采购单详情。
func (r *PurchaseOrderRepo) GetByID(ctx context.Context, id uint, preloads ...string) (*psimodel.PsiPurchaseOrder, error) {
	return r.BaseRepo.GetByID(ctx, id, preloads...)
}

// Update 更新采购单主表字段。
func (r *PurchaseOrderRepo) Update(ctx context.Context, m *psimodel.PsiPurchaseOrder) error {
	return r.BaseRepo.Update(ctx, m,
		"OrderNo", "SupplierID", "WarehouseID", "OrderDate", "ExpectedDate",
		"TotalQuantity", "TotalAmount", "DiscountAmount", "Status", "ApprovalStatus", "OperatorID", "Remark")
}

// PurchaseOrderDetailRepo 采购单明细。
type PurchaseOrderDetailRepo struct {
	repository.BaseRepo[psimodel.PsiPurchaseOrderDetail]
}

func NewPurchaseOrderDetailRepo() *PurchaseOrderDetailRepo { return &PurchaseOrderDetailRepo{} }

// ListByOrder 按采购单列明细。
func (r *PurchaseOrderDetailRepo) ListByOrder(ctx context.Context, orderID uint) ([]psimodel.PsiPurchaseOrderDetail, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"order_id": orderID},
		Order: []string{"id ASC"},
	})
}

// DeleteByOrder 删除某采购单的全部明细(更新明细时先清后插)。
func (r *PurchaseOrderDetailRepo) DeleteByOrder(ctx context.Context, orderID uint) error {
	return repository.DBFrom(ctx).Where("order_id = ?", orderID).
		Delete(&psimodel.PsiPurchaseOrderDetail{}).Error
}

// ── 采购退货 ──

// PurchaseReturnRepo 采购退货。
type PurchaseReturnRepo struct {
	repository.BaseRepo[psimodel.PsiPurchaseReturn]
}

func NewPurchaseReturnRepo() *PurchaseReturnRepo { return &PurchaseReturnRepo{} }

func (r *PurchaseReturnRepo) GetByID(ctx context.Context, id uint, preloads ...string) (*psimodel.PsiPurchaseReturn, error) {
	return r.BaseRepo.GetByID(ctx, id, preloads...)
}

func (r *PurchaseReturnRepo) Update(ctx context.Context, m *psimodel.PsiPurchaseReturn) error {
	return r.BaseRepo.Update(ctx, m,
		"ReturnNo", "OrderID", "SupplierID", "WarehouseID", "ReturnDate",
		"TotalAmount", "Status", "ApprovalStatus", "OperatorID", "Remark")
}

// PurchaseReturnDetailRepo 采购退货明细。
type PurchaseReturnDetailRepo struct {
	repository.BaseRepo[psimodel.PsiPurchaseReturnDetail]
}

func NewPurchaseReturnDetailRepo() *PurchaseReturnDetailRepo { return &PurchaseReturnDetailRepo{} }

func (r *PurchaseReturnDetailRepo) ListByReturn(ctx context.Context, returnID uint) ([]psimodel.PsiPurchaseReturnDetail, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"return_id": returnID},
		Order: []string{"id ASC"},
	})
}
