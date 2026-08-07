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
