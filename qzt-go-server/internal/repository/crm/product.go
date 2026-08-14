package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// product.go 商品 repository。

type ProductRepo struct {
	repository.BaseRepo[crmmodel.CrmProduct]
}

func NewProductRepo() *ProductRepo { return &ProductRepo{} }

func (r *ProductRepo) Update(ctx context.Context, m *crmmodel.CrmProduct) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "ProductNo", "Category", "Unit", "StandardPrice", "CostPrice", "Status", "ImageURL", "Description")
}
