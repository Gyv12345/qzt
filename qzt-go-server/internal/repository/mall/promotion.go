package mall

import (
	"context"

	"qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/repository"
)

// promotion.go 限时特价仓储。同商品允许多条活动,生效查询只取
// 「当前时间窗内 status=1」的集合,最低价由服务层归并。

// PromotionRepo 限时特价仓储。
type PromotionRepo struct {
	repository.BaseRepo[mall.MallPromotion]
}

// NewPromotionRepo 构造。
func NewPromotionRepo() *PromotionRepo { return &PromotionRepo{} }

// ListActiveByProducts 批量取商品集合当前生效的活动(启用 + 时间窗内),
// 按活动价升序,服务层取每商品首条即为最低价。
func (r *PromotionRepo) ListActiveByProducts(ctx context.Context, productIDs []uint) ([]mall.MallPromotion, error) {
	if len(productIDs) == 0 {
		return nil, nil
	}
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": mall.PromotionStatusEnabled},
		Conds: []repository.Cond{
			{Query: "product_id IN ?", Args: []any{productIDs}},
			{Query: "start_at <= NOW(3)"},
			{Query: "end_at >= NOW(3)"},
		},
		Order: []string{"promo_price ASC"},
	})
}
