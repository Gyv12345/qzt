package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// supplier.go 供应商 repository。

// SupplierRepo 供应商。
type SupplierRepo struct {
	repository.BaseRepo[psimodel.PsiSupplier]
}

func NewSupplierRepo() *SupplierRepo { return &SupplierRepo{} }

func (r *SupplierRepo) Update(ctx context.Context, m *psimodel.PsiSupplier) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "SupplierNo", "ContactPerson", "Phone", "Email", "Address",
		"BankName", "BankAccount", "Status", "Remark")
}

// ListEnabled 列出启用的供应商(下拉用)。
func (r *SupplierRepo) ListEnabled(ctx context.Context) ([]psimodel.PsiSupplier, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": psimodel.StatusEnabled},
		Order: []string{"id ASC"},
	})
}
