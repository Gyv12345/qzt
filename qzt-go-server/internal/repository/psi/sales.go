package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// sales.go 销售订单 + 销售退货 repository。与采购对称。

// SalesOrderRepo 销售订单。
type SalesOrderRepo struct {
	repository.BaseRepo[psimodel.PsiSalesOrder]
}

func NewSalesOrderRepo() *SalesOrderRepo { return &SalesOrderRepo{} }

func (r *SalesOrderRepo) GetByID(ctx context.Context, id uint, preloads ...string) (*psimodel.PsiSalesOrder, error) {
	return r.BaseRepo.GetByID(ctx, id, preloads...)
}

func (r *SalesOrderRepo) Update(ctx context.Context, m *psimodel.PsiSalesOrder) error {
	return r.BaseRepo.Update(ctx, m,
		"OrderNo", "CustomerID", "WarehouseID", "OrderDate",
		"TotalQuantity", "TotalAmount", "DiscountAmount", "Status", "ApprovalStatus", "OperatorID", "Remark")
}

// SalesOrderDetailRepo 销售单明细。
type SalesOrderDetailRepo struct {
	repository.BaseRepo[psimodel.PsiSalesOrderDetail]
}

func NewSalesOrderDetailRepo() *SalesOrderDetailRepo { return &SalesOrderDetailRepo{} }

func (r *SalesOrderDetailRepo) ListByOrder(ctx context.Context, orderID uint) ([]psimodel.PsiSalesOrderDetail, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"order_id": orderID},
		Order: []string{"id ASC"},
	})
}

func (r *SalesOrderDetailRepo) DeleteByOrder(ctx context.Context, orderID uint) error {
	return repository.DBFrom(ctx).Where("order_id = ?", orderID).
		Delete(&psimodel.PsiSalesOrderDetail{}).Error
}

// ── 销售退货 ──

// SalesReturnRepo 销售退货。
type SalesReturnRepo struct {
	repository.BaseRepo[psimodel.PsiSalesReturn]
}

func NewSalesReturnRepo() *SalesReturnRepo { return &SalesReturnRepo{} }

func (r *SalesReturnRepo) GetByID(ctx context.Context, id uint, preloads ...string) (*psimodel.PsiSalesReturn, error) {
	return r.BaseRepo.GetByID(ctx, id, preloads...)
}

func (r *SalesReturnRepo) Update(ctx context.Context, m *psimodel.PsiSalesReturn) error {
	return r.BaseRepo.Update(ctx, m,
		"ReturnNo", "OrderID", "CustomerID", "WarehouseID", "ReturnDate",
		"TotalAmount", "Status", "ApprovalStatus", "OperatorID", "Remark")
}

// SalesReturnDetailRepo 销售退货明细。
type SalesReturnDetailRepo struct {
	repository.BaseRepo[psimodel.PsiSalesReturnDetail]
}

func NewSalesReturnDetailRepo() *SalesReturnDetailRepo { return &SalesReturnDetailRepo{} }

func (r *SalesReturnDetailRepo) ListByReturn(ctx context.Context, returnID uint) ([]psimodel.PsiSalesReturnDetail, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"return_id": returnID},
		Order: []string{"id ASC"},
	})
}

func (r *SalesReturnDetailRepo) DeleteByReturn(ctx context.Context, returnID uint) error {
	return repository.DBFrom(ctx).Where("return_id = ?", returnID).
		Delete(&psimodel.PsiSalesReturnDetail{}).Error
}
