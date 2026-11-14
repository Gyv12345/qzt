package storefront

import (
	"context"

	"qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/repository"
)

// order.go 独立站订单仓储(嵌泛型基座,事务经 context 传递)。

// OrderRepo 独立站订单主单仓储。
type OrderRepo struct {
	repository.BaseRepo[storefront.StorefrontOrder]
}

// NewOrderRepo 构造。
func NewOrderRepo() *OrderRepo { return &OrderRepo{} }

// GetByOrderNo 凭订单号取单(软删自动过滤;查无返回 gorm.ErrRecordNotFound)。
func (r *OrderRepo) GetByOrderNo(ctx context.Context, orderNo string) (*storefront.StorefrontOrder, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"order_no": orderNo},
	})
}

// ItemRepo 独立站订单明细仓储。
type ItemRepo struct {
	repository.BaseRepo[storefront.StorefrontOrderItem]
}

// NewItemRepo 构造。
func NewItemRepo() *ItemRepo { return &ItemRepo{} }

// ListByOrder 取某订单的全部明细(id 升序,保持下单顺序)。
func (r *ItemRepo) ListByOrder(ctx context.Context, orderID uint) ([]storefront.StorefrontOrderItem, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"order_id": orderID},
		Order: []string{"id ASC"},
	})
}
