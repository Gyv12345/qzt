package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// asset.go 固定资产 repository。

type AssetRepo struct {
	repository.BaseRepo[psimodel.PsiAsset]
}

func NewAssetRepo() *AssetRepo { return &AssetRepo{} }

func (r *AssetRepo) PageList(ctx context.Context, page, pageSize int, keyword, category string, status int8, ownerID, deptID uint) ([]psimodel.PsiAsset, int64, error) {
	var list []psimodel.PsiAsset
	q := repository.DBFrom(ctx).Model(&psimodel.PsiAsset{})
	if keyword != "" {
		q = q.Where("name LIKE ? OR asset_no LIKE ? OR serial_no LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if ownerID > 0 {
		q = q.Where("owner_id = ?", ownerID)
	}
	if deptID > 0 {
		q = q.Where("dept_id = ?", deptID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *AssetRepo) Update(ctx context.Context, m *psimodel.PsiAsset) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Category", "Spec", "SerialNo", "WarehouseID", "DeptID", "OwnerID", "PurchaseDate", "PurchasePrice", "Depreciation", "NetValue", "UsefulLife", "Status", "Location", "Remark")
}

// CountByNoPrefix 统计同前缀资产数(资产编号 ZC+日期+序号 推算用)。
func (r *AssetRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var count int64
	err := repository.DBFrom(ctx).Unscoped().Model(&psimodel.PsiAsset{}).
		Where("asset_no LIKE ?", prefix+"%").
		Count(&count).Error
	return count, err
}

// ListByScope 按盘点范围取可盘资产:状态为使用中/闲置/维修中,可再按分类名或部门ID收窄。
// scopeValue 仅在 category/dept 范围下参与过滤(all 时不看该值)。
func (r *AssetRepo) ListByScope(ctx context.Context, scopeType, scopeValue string) ([]psimodel.PsiAsset, error) {
	q := repository.DBFrom(ctx).Model(&psimodel.PsiAsset{}).
		Where("status IN ?", []int8{psimodel.AssetStatusInUse, psimodel.AssetStatusIdle, psimodel.AssetStatusInRepair})
	switch scopeType {
	case psimodel.AssetStocktakeScopeCategory:
		q = q.Where("category = ?", scopeValue)
	case psimodel.AssetStocktakeScopeDept:
		q = q.Where("dept_id = ?", scopeValue)
	}
	var list []psimodel.PsiAsset
	err := q.Order("id ASC").Find(&list).Error
	return list, err
}

// UpdateStatusByIDs 批量更新资产状态(盘点差异联动:缺失→丢失、损坏→维修)。
func (r *AssetRepo) UpdateStatusByIDs(ctx context.Context, ids []uint, status int8) error {
	if len(ids) == 0 {
		return nil
	}
	return repository.DBFrom(ctx).Model(&psimodel.PsiAsset{}).
		Where("id IN ?", ids).
		Update("status", status).Error
}

// ListDepreciable 取可折旧资产:状态为使用中/闲置/维修中且使用年限>0。
func (r *AssetRepo) ListDepreciable(ctx context.Context) ([]psimodel.PsiAsset, error) {
	var list []psimodel.PsiAsset
	err := repository.DBFrom(ctx).Model(&psimodel.PsiAsset{}).
		Where("status IN ? AND useful_life > 0", []int8{psimodel.AssetStatusInUse, psimodel.AssetStatusIdle, psimodel.AssetStatusInRepair}).
		Order("id ASC").Find(&list).Error
	return list, err
}
