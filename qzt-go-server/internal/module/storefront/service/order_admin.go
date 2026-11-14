package service

import (
	"context"

	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/repository"
	sfrepo "qzt-go-server/internal/repository/storefront"
)

// order_admin.go 独立站订单管理(后台,JWT + Casbin)。
// 只读:分页列表(status/keyword 筛选)+ 详情(主单+items 嵌套)。

// OrderAdminService 独立站订单管理服务。
type OrderAdminService struct {
	orderRepo *sfrepo.OrderRepo
	itemRepo  *sfrepo.ItemRepo
}

// NewOrderAdminService 构造。
func NewOrderAdminService() *OrderAdminService {
	return &OrderAdminService{
		orderRepo: sfrepo.NewOrderRepo(),
		itemRepo:  sfrepo.NewItemRepo(),
	}
}

// OrderItemDTO 订单明细视图。
type OrderItemDTO = sfmodel.StorefrontOrderItem

// OrderDetailDTO 订单视图(主单 + 明细嵌套 + 状态中文)。
type OrderDetailDTO struct {
	sfmodel.StorefrontOrder
	// 状态中文
	StatusLabel string         `json:"status_label"`
	Items       []OrderItemDTO `json:"items"`
}

// List 订单分页(status>0 筛选;keyword 匹配订单号/买家邮箱/姓名)。
func (s *OrderAdminService) List(ctx context.Context, page, pageSize int, status *int8, keyword string) ([]OrderDetailDTO, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"id DESC"},
	}
	if status != nil && *status > 0 {
		q.Where = map[string]any{"status": *status}
	}
	if keyword != "" {
		q.Search = map[string]string{
			"order_no":          keyword,
			"customer_email":    keyword,
			"customer_name":     keyword,
			"stripe_session_id": keyword,
		}
	}
	list, total, err := s.orderRepo.PageList(ctx, page, pageSize, q)
	if err != nil {
		return nil, 0, err
	}
	out := make([]OrderDetailDTO, 0, len(list))
	for i := range list {
		dto, err := s.attachItems(ctx, &list[i])
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *dto)
	}
	return out, total, nil
}

// GetByID 订单详情(主单+明细)。
func (s *OrderAdminService) GetByID(ctx context.Context, id uint) (*OrderDetailDTO, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "订单不存在")
	}
	return s.attachItems(ctx, order)
}

// attachItems 组装主单+明细。
func (s *OrderAdminService) attachItems(ctx context.Context, order *sfmodel.StorefrontOrder) (*OrderDetailDTO, error) {
	items, err := s.itemRepo.ListByOrder(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []sfmodel.StorefrontOrderItem{}
	}
	return &OrderDetailDTO{
		StorefrontOrder: *order,
		StatusLabel:     sfmodel.OrderStatusLabel(order.Status),
		Items:           items,
	}, nil
}
