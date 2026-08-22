package service

import (
	"context"

	crrepo "qzt-go-server/internal/repository/crm"
)

// sku_helper.go 单据明细的规格 SKU 辅助。
// 解析规则:明细带 sku_id 时校验归属;不带时回退商品默认规格(spec=''),
// 商品只有一个 SKU 时取唯一——兼容移动端/历史调用方只传 product_id。

// resolveSkuID 解析明细的规格 SKU ID。
func resolveSkuID(ctx context.Context, productID, skuID uint) (uint, error) {
	sku, err := crrepo.NewProductSkuRepo().ResolveForProduct(ctx, productID, skuID)
	if err != nil {
		return 0, err
	}
	return sku.ID, nil
}

// fillSkuSpec 批量回填明细行的规格描述(n=行数,get 取第 i 行 sku_id,set 写回)。
// sku_id=0 的历史行留空,由前端按「默认规格」展示。
func fillSkuSpec(ctx context.Context, n int, get func(i int) uint, set func(i int, spec string)) error {
	ids := make([]uint, 0, n)
	for i := 0; i < n; i++ {
		if id := get(i); id > 0 {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	specMap, err := fetchSkuSpecs(ctx, ids)
	if err != nil {
		return err
	}
	for i := 0; i < n; i++ {
		set(i, specMap[get(i)])
	}
	return nil
}
