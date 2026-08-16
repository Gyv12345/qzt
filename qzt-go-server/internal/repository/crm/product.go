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

// CountByNoPrefix 统计 product_no LIKE 前缀% 且非空的记录数(自动编号规则 CP 推算用)。
func (r *ProductRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(&crmmodel.CrmProduct{}).
		Where("product_no LIKE ?", prefix+"%").
		Where("product_no != ''").
		Count(&n).Error
	return n, err
}
