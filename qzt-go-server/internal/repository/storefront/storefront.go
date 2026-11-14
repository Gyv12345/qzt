package storefront

import (
	"context"

	"qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/repository"
)

// storefront.go 跨境独立站仓储(嵌泛型基座,事务经 context 传递)。

// ProductRepo 独立站商品上架位仓储。
type ProductRepo struct {
	repository.BaseRepo[storefront.StorefrontProduct]
}

// NewProductRepo 构造。
func NewProductRepo() *ProductRepo { return &ProductRepo{} }

// I18nRepo 独立站商品翻译仓储。
type I18nRepo struct {
	repository.BaseRepo[storefront.StorefrontProductI18n]
}

// NewI18nRepo 构造。
func NewI18nRepo() *I18nRepo { return &I18nRepo{} }

// ListByProduct 取某上架位的全部语言翻译。
func (r *I18nRepo) ListByProduct(ctx context.Context, storefrontProductID uint) ([]storefront.StorefrontProductI18n, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"storefront_product_id": storefrontProductID},
		Order: []string{"id ASC"},
	})
}

// InquiryRepo 独立站询盘仓储。
type InquiryRepo struct {
	repository.BaseRepo[storefront.StorefrontInquiry]
}

// NewInquiryRepo 构造。
func NewInquiryRepo() *InquiryRepo {
	return &InquiryRepo{}
}
