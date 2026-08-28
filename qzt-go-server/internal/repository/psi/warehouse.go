package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// warehouse.go 仓库 repository。

// WarehouseRepo 仓库。
type WarehouseRepo struct {
	repository.BaseRepo[psimodel.PsiWarehouse]
}

func NewWarehouseRepo() *WarehouseRepo { return &WarehouseRepo{} }

func (r *WarehouseRepo) Update(ctx context.Context, m *psimodel.PsiWarehouse) error {
	return r.BaseRepo.Update(ctx, m,
		"Code", "Name", "Address", "ManagerID", "Phone", "Sort", "Status", "IsDefault", "Remark")
}

// ListEnabled 列出启用的仓库(下拉用)。
func (r *WarehouseRepo) ListEnabled(ctx context.Context) ([]psimodel.PsiWarehouse, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": psimodel.StatusEnabled},
		Order: []string{"sort ASC", "id ASC"},
	})
}

// ListByIDs 按仓库 ID 集合批量查(含已软删,历史库存/流水展示兜底)。
func (r *WarehouseRepo) ListByIDs(ctx context.Context, ids []uint) ([]psimodel.PsiWarehouse, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var list []psimodel.PsiWarehouse
	if err := repository.DBFrom(ctx).Unscoped().Where("id IN ?", ids).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
