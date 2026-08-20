package mall

import (
	"context"

	"qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/repository"
)

// order.go 商城订单仓储(嵌泛型基座,事务经 context 传递)。

// OrderRepo 商城订单仓储。
type OrderRepo struct {
	repository.BaseRepo[mall.MallOrder]
}

// NewOrderRepo 构造。
func NewOrderRepo() *OrderRepo { return &OrderRepo{} }

// ItemRepo 商城订单明细仓储。
type ItemRepo struct {
	repository.BaseRepo[mall.MallOrderItem]
}

// NewItemRepo 构造。
func NewItemRepo() *ItemRepo { return &ItemRepo{} }

// ListByOrder 按订单取明细。
func (r *ItemRepo) ListByOrder(ctx context.Context, orderID uint) ([]mall.MallOrderItem, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"order_id": orderID},
		Order: []string{"id ASC"},
	})
}
