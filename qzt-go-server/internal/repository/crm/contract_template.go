package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// contract_template.go 合同模板 repository。

type ContractTemplateRepo struct {
	repository.BaseRepo[crmmodel.ContractTemplate]
}

func NewContractTemplateRepo() *ContractTemplateRepo { return &ContractTemplateRepo{} }

func (r *ContractTemplateRepo) Update(ctx context.Context, m *crmmodel.ContractTemplate) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Content", "Remark", "Enabled")
}
