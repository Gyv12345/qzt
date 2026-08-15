package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// purchase.go 采购订单 + 采购退货 repository。

// PurchaseOrderRepo 采购订单。
type PurchaseOrderRepo struct {
	repository.BaseRepo[psimodel.PsiPurchaseOrder]
}

func NewPurchaseOrderRepo() *PurchaseOrderRepo { return &PurchaseOrderRepo{} }

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
