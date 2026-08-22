package crm

import (
	"context"
	"errors"

	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// product_sku.go 商品规格 SKU repository。
// ResolveForProduct 是全系统「product_id → sku_id」兜底解析的唯一入口:
// 单据/库存/商城等只拿到商品 ID 的调用方(移动端、历史逻辑)据此落到具体 SKU。

type ProductSkuRepo struct {
	repository.BaseRepo[crmmodel.CrmProductSku]
}

func NewProductSkuRepo() *ProductSkuRepo { return &ProductSkuRepo{} }

// ListByProduct 商品的全部 SKU(按 id 升序,默认规格通常在最前)。
func (r *ProductSkuRepo) ListByProduct(ctx context.Context, productID uint) ([]crmmodel.CrmProductSku, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"product_id": productID},
		Order: []string{"id ASC"},
	})
}

// ListByProducts 批量按商品 ID 集合查 SKU(列表页规格展示用)。
func (r *ProductSkuRepo) ListByProducts(ctx context.Context, productIDs []uint) ([]crmmodel.CrmProductSku, error) {
	if len(productIDs) == 0 {
		return nil, nil
	}
	return r.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "product_id IN ?", Args: []any{productIDs}}},
		Order: []string{"id ASC"},
	})
}

// ListByIDs 按 SKU ID 集合批量查(含已软删,历史单据展示兜底)。
func (r *ProductSkuRepo) ListByIDs(ctx context.Context, ids []uint) ([]crmmodel.CrmProductSku, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var list []crmmodel.CrmProductSku
	if err := repository.DBFrom(ctx).Unscoped().Where("id IN ?", ids).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// ResolveForProduct 解析「商品 + 可选 SKU」到具体 SKU。
// skuID > 0 时校验归属;skuID = 0 时回退:spec='' 的默认规格优先,
// 商品只有一个 SKU 时取其唯一;多规格且未指定返回错误(调用方应提示选规格)。
func (r *ProductSkuRepo) ResolveForProduct(ctx context.Context, productID, skuID uint) (*crmmodel.CrmProductSku, error) {
	if skuID > 0 {
		sku, err := r.GetByID(ctx, skuID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("商品规格不存在,请刷新后重试")
			}
			return nil, err
		}
		if sku.ProductID != productID {
			return nil, errors.New("商品规格与商品不匹配")
		}
		return sku, nil
	}
	skus, err := r.ListByProduct(ctx, productID)
	if err != nil {
		return nil, err
	}
	if len(skus) == 0 {
		return nil, errors.New("商品缺少规格数据,请在商品管理中补全")
	}
	for i := range skus {
		if skus[i].Spec == "" {
			return &skus[i], nil
		}
	}
	if len(skus) == 1 {
		return &skus[0], nil
	}
	return nil, errors.New("该商品有多个规格,请指定规格")
}

// SpecExists 同商品下是否已有相同 spec 的 SKU(服务层做唯一性,排除 excludeID)。
func (r *ProductSkuRepo) SpecExists(ctx context.Context, productID uint, spec string, excludeID uint) (bool, error) {
	q := &repository.QueryOptions{Where: map[string]any{"product_id": productID, "spec": spec}}
	if excludeID > 0 {
		q.Conds = []repository.Cond{{Query: "id != ?", Args: []any{excludeID}}}
	}
	return r.Exists(ctx, q)
}
