package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// asset_stocktake.go 资产盘点单/明细 + 折旧计提日志 repository。

// ── 资产盘点单 ──

type AssetStocktakeRepo struct {
	repository.BaseRepo[psimodel.PsiAssetStocktake]
}

func NewAssetStocktakeRepo() *AssetStocktakeRepo { return &AssetStocktakeRepo{} }

// CountByNoPrefix 统计同前缀盘点单数(编号 PD+日期+序号 推算用)。
func (r *AssetStocktakeRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var count int64
	err := repository.DBFrom(ctx).Unscoped().Model(&psimodel.PsiAssetStocktake{}).
		Where("stocktake_no LIKE ?", prefix+"%").
		Count(&count).Error
	return count, err
}

type AssetStocktakeItemRepo struct {
	repository.BaseRepo[psimodel.PsiAssetStocktakeItem]
}

func NewAssetStocktakeItemRepo() *AssetStocktakeItemRepo { return &AssetStocktakeItemRepo{} }

// ListByStocktake 取盘点单全部明细(按 ID 升序)。
func (r *AssetStocktakeItemRepo) ListByStocktake(ctx context.Context, stocktakeID uint) ([]psimodel.PsiAssetStocktakeItem, error) {
	var list []psimodel.PsiAssetStocktakeItem
	err := repository.DBFrom(ctx).Where("stocktake_id = ?", stocktakeID).Order("id ASC").Find(&list).Error
	return list, err
}

// ── 折旧计提日志 ──

type DepreciationRepo struct {
	repository.BaseRepo[psimodel.PsiAssetDepreciationLog]
}

func NewDepreciationRepo() *DepreciationRepo { return &DepreciationRepo{} }

// ListAssetIDsByPeriod 某期间已计提的资产 ID 集合(幂等跳过用)。
func (r *DepreciationRepo) ListAssetIDsByPeriod(ctx context.Context, period string) (map[uint]bool, error) {
	var ids []uint
	err := repository.DBFrom(ctx).Model(&psimodel.PsiAssetDepreciationLog{}).
		Where("period = ?", period).
		Pluck("asset_id", &ids).Error
	if err != nil {
		return nil, err
	}
	m := make(map[uint]bool, len(ids))
	for _, id := range ids {
		m[id] = true
	}
	return m, nil
}

// ListByAsset 某资产的折旧日志(期间升序)。
func (r *DepreciationRepo) ListByAsset(ctx context.Context, assetID uint) ([]psimodel.PsiAssetDepreciationLog, error) {
	var list []psimodel.PsiAssetDepreciationLog
	err := repository.DBFrom(ctx).Where("asset_id = ?", assetID).Order("period ASC").Find(&list).Error
	return list, err
}
