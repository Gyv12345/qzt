package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// inventory.go 盘点/调拨 repository。
// 库存变动的核心逻辑在 service/stock_core.go 的 applyMovement 编排,
// 本文件只提供单据读写与少量专用查询。

// ── 盘点 ──

type StocktakeRepo struct {
	repository.BaseRepo[psimodel.PsiStocktake]
}

func NewStocktakeRepo() *StocktakeRepo { return &StocktakeRepo{} }

// ExistsOngoingByWarehouse 同仓是否已有进行中的盘点单(status=1)。
// 同仓同时只允许一张盘点中的单,防止两张单的账面快照口径互相踩。
func (r *StocktakeRepo) ExistsOngoingByWarehouse(ctx context.Context, warehouseID uint) (bool, error) {
	var cnt int64
	err := repository.DBFrom(ctx).Model(&psimodel.PsiStocktake{}).
		Where("warehouse_id = ? AND status = ?", warehouseID, psimodel.StocktakeStatusOngoing).
		Count(&cnt).Error
	return cnt > 0, err
}

type StocktakeItemRepo struct {
	repository.BaseRepo[psimodel.PsiStocktakeItem]
}

func NewStocktakeItemRepo() *StocktakeItemRepo { return &StocktakeItemRepo{} }

// ListByStocktake 按盘点单列出明细(id ASC)。
func (r *StocktakeItemRepo) ListByStocktake(ctx context.Context, stocktakeID uint) ([]psimodel.PsiStocktakeItem, error) {
	var items []psimodel.PsiStocktakeItem
	err := repository.DBFrom(ctx).Where("stocktake_id = ?", stocktakeID).Order("id ASC").Find(&items).Error
	return items, err
}

// ── 调拨 ──

type TransferRepo struct {
	repository.BaseRepo[psimodel.PsiStockTransfer]
}

func NewTransferRepo() *TransferRepo { return &TransferRepo{} }

type TransferItemRepo struct {
	repository.BaseRepo[psimodel.PsiStockTransferItem]
}

func NewTransferItemRepo() *TransferItemRepo { return &TransferItemRepo{} }

// ListByTransfer 按调拨单列出明细(id ASC)。
func (r *TransferItemRepo) ListByTransfer(ctx context.Context, transferID uint) ([]psimodel.PsiStockTransferItem, error) {
	var items []psimodel.PsiStockTransferItem
	err := repository.DBFrom(ctx).Where("transfer_id = ?", transferID).Order("id ASC").Find(&items).Error
	return items, err
}

// ListByWarehouse 按仓库列出全部结余行(盘点快照用;含零结余行)。
func (r *StockRepo) ListByWarehouse(ctx context.Context, warehouseID uint) ([]psimodel.PsiStock, error) {
	var stocks []psimodel.PsiStock
	err := repository.DBFrom(ctx).Where("warehouse_id = ?", warehouseID).Order("id ASC").Find(&stocks).Error
	return stocks, err
}
