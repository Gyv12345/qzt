package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// product.go 商品 + 多价格 repository。

type ProductRepo struct {
	repository.BaseRepo[crmmodel.CrmProduct]
}

func NewProductRepo() *ProductRepo { return &ProductRepo{} }

func (r *ProductRepo) Update(ctx context.Context, m *crmmodel.CrmProduct) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "ProductNo", "Category", "Unit", "StandardPrice", "CostPrice", "Status", "ImageURL", "Description")
}

// ── 商品价格 ──

type ProductPriceRepo struct {
	repository.BaseRepo[crmmodel.CrmProductPrice]
}

func NewProductPriceRepo() *ProductPriceRepo { return &ProductPriceRepo{} }

func (r *ProductPriceRepo) Update(ctx context.Context, m *crmmodel.CrmProductPrice) error {
	return r.BaseRepo.Update(ctx, m, "PriceType", "Price", "MinQuantity", "Remark")
}

func (r *ProductPriceRepo) ListByProduct(ctx context.Context, productID uint) ([]crmmodel.CrmProductPrice, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"product_id": productID},
		Order: []string{"id ASC"},
	})
}
