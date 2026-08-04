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
		Where: map[string]interface{}{"status": psimodel.StatusEnabled},
		Order: []string{"sort ASC", "id ASC"},
	})
}
