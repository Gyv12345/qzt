package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// stock_io.go 其他入库/出库单(盘点盈亏、赠品、领用、损耗)repository。

// StockInOrderRepo 其他入库单。
type StockInOrderRepo struct {
	repository.BaseRepo[psimodel.PsiStockInOrder]
}

func NewStockInOrderRepo() *StockInOrderRepo { return &StockInOrderRepo{} }

func (r *StockInOrderRepo) GetByID(ctx context.Context, id uint, preloads ...string) (*psimodel.PsiStockInOrder, error) {
	return r.BaseRepo.GetByID(ctx, id, preloads...)
}

func (r *StockInOrderRepo) Update(ctx context.Context, m *psimodel.PsiStockInOrder) error {
	return r.BaseRepo.Update(ctx, m,
		"OrderNo", "WarehouseID", "BizType", "OrderDate", "TotalAmount", "Status", "OperatorID", "Remark")
}

// StockInOrderDetailRepo 其他入库明细。
type StockInOrderDetailRepo struct {
	repository.BaseRepo[psimodel.PsiStockInOrderDetail]
}

func NewStockInOrderDetailRepo() *StockInOrderDetailRepo { return &StockInOrderDetailRepo{} }

func (r *StockInOrderDetailRepo) ListByOrder(ctx context.Context, orderID uint) ([]psimodel.PsiStockInOrderDetail, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"order_id": orderID},
		Order: []string{"id ASC"},
	})
}

// StockOutOrderRepo 其他出库单。
type StockOutOrderRepo struct {
	repository.BaseRepo[psimodel.PsiStockOutOrder]
}

func NewStockOutOrderRepo() *StockOutOrderRepo { return &StockOutOrderRepo{} }

func (r *StockOutOrderRepo) GetByID(ctx context.Context, id uint, preloads ...string) (*psimodel.PsiStockOutOrder, error) {
	return r.BaseRepo.GetByID(ctx, id, preloads...)
}

func (r *StockOutOrderRepo) Update(ctx context.Context, m *psimodel.PsiStockOutOrder) error {
	return r.BaseRepo.Update(ctx, m,
		"OrderNo", "WarehouseID", "BizType", "OrderDate", "Status", "OperatorID", "Remark")
}

// StockOutOrderDetailRepo 其他出库明细。
type StockOutOrderDetailRepo struct {
	repository.BaseRepo[psimodel.PsiStockOutOrderDetail]
}

func NewStockOutOrderDetailRepo() *StockOutOrderDetailRepo { return &StockOutOrderDetailRepo{} }

func (r *StockOutOrderDetailRepo) ListByOrder(ctx context.Context, orderID uint) ([]psimodel.PsiStockOutOrderDetail, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"order_id": orderID},
		Order: []string{"id ASC"},
	})
}
