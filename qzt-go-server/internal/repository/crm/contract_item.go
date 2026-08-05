package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// contract_item.go 合同产品明细 repository。

type ContractItemRepo struct {
	repository.BaseRepo[crmmodel.CrmContractItem]
}

func NewContractItemRepo() *ContractItemRepo { return &ContractItemRepo{} }

func (r *ContractItemRepo) Update(ctx context.Context, m *crmmodel.CrmContractItem) error {
	return r.BaseRepo.Update(ctx, m, "ProductName", "ProductID", "Quantity", "Unit", "UnitPrice", "Amount", "Remark")
}

func (r *ContractItemRepo) ListByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractItem, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"contract_id": contractID},
		Order: []string{"id ASC"},
	})
}
