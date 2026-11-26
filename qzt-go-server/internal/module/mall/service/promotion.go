package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	mallmodel "qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/repository"
	crmrepo "qzt-go-server/internal/repository/crm"
	mallrepo "qzt-go-server/internal/repository/mall"
	"qzt-go-server/pkg/xtime"
)

// promotion.go 限时特价服务:管理端 CRUD + 生效价查询。
// 同商品可有多条历史活动,生效价统一取「当前时间窗内 status=1 的最低 promo_price」;
// 公开 DTO 与下单计价共用 ActivePricesByProducts,保证展示价=成交价。

// PromotionService 限时特价服务。
type PromotionService struct {
	promoRepo *mallrepo.PromotionRepo
	prodRepo  *crmrepo.ProductRepo
}

// NewPromotionService 构造。
func NewPromotionService() *PromotionService {
	return &PromotionService{promoRepo: mallrepo.NewPromotionRepo(), prodRepo: crmrepo.NewProductRepo()}
}

// ActivePricesByProducts 商品集合的当前生效最低活动价 map(productID → promo_price)。
// PublicGoods 与 CreateOrder 计价共用,两处口径永远一致。
func (s *PromotionService) ActivePricesByProducts(ctx context.Context, productIDs []uint) map[uint]decimal.Decimal {
	out := make(map[uint]decimal.Decimal, len(productIDs))
	list, err := s.promoRepo.ListActiveByProducts(ctx, productIDs)
	if err != nil {
		return out // 查询失败按无活动处理,不阻断列表/下单
	}
	for i := range list {
		p := &list[i]
		if prev, ok := out[p.ProductID]; ok && prev.LessThanOrEqual(p.PromoPrice) {
			continue
		}
		out[p.ProductID] = p.PromoPrice
	}
	return out
}

// ── 管理端 ──

// validatePromotionWindow 活动窗口必填且起止有效。
func validatePromotionWindow(startAt, endAt xtime.DateTime) error {
	if startAt.IsZero() || endAt.IsZero() {
		return errors.New("活动开始与结束时间必填")
	}
	if !time.Time(startAt).Before(time.Time(endAt)) {
		return errors.New("开始时间必须早于结束时间")
	}
	return nil
}

// PromotionCreateRequest 创建活动请求。
type PromotionCreateRequest struct {
	Name       string          `json:"name" binding:"required,max=64"`
	ProductID  uint            `json:"product_id" binding:"required"`
	PromoPrice decimal.Decimal `json:"promo_price"`
	StartAt    xtime.DateTime  `json:"start_at"`
	EndAt      xtime.DateTime  `json:"end_at"`
}

// AdminCreate 创建活动。
func (s *PromotionService) AdminCreate(ctx context.Context, req *PromotionCreateRequest) (*mallmodel.MallPromotion, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("活动名不能为空")
	}
	if !req.PromoPrice.IsPositive() {
		return nil, errors.New("活动价必须大于 0")
	}
	if err := validatePromotionWindow(req.StartAt, req.EndAt); err != nil {
		return nil, err
	}
	if _, err := s.prodRepo.GetByID(ctx, req.ProductID); err != nil {
		return nil, repository.NotFoundOr(err, "商品不存在")
	}
	promo := &mallmodel.MallPromotion{
		Name: req.Name, ProductID: req.ProductID, PromoPrice: req.PromoPrice,
		StartAt: req.StartAt, EndAt: req.EndAt, Status: mallmodel.PromotionStatusEnabled,
	}
	if err := s.promoRepo.Create(ctx, promo); err != nil {
		return nil, err
	}
	return promo, nil
}

// PromotionUpdateRequest 更新活动请求(半增量:指针字段才更新;
// start_at/end_at 同传时整体校验起止,单传则与库中另一端比较)。
type PromotionUpdateRequest struct {
	Name       *string          `json:"name"`
	ProductID  *uint            `json:"product_id"`
	PromoPrice *decimal.Decimal `json:"promo_price"`
	StartAt    *xtime.DateTime  `json:"start_at"`
	EndAt      *xtime.DateTime  `json:"end_at"`
	Status     *int8            `json:"status"`
}

// AdminUpdate 半增量更新。
func (s *PromotionService) AdminUpdate(ctx context.Context, id uint, req *PromotionUpdateRequest) (*mallmodel.MallPromotion, error) {
	promo, err := s.promoRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "活动不存在")
	}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, errors.New("活动名不能为空")
		}
		promo.Name = name
	}
	if req.ProductID != nil && *req.ProductID != promo.ProductID {
		if _, err := s.prodRepo.GetByID(ctx, *req.ProductID); err != nil {
			return nil, repository.NotFoundOr(err, "商品不存在")
		}
		promo.ProductID = *req.ProductID
	}
	if req.PromoPrice != nil {
		if !req.PromoPrice.IsPositive() {
			return nil, errors.New("活动价必须大于 0")
		}
		promo.PromoPrice = *req.PromoPrice
	}
	startAt, endAt := promo.StartAt, promo.EndAt
	if req.StartAt != nil {
		startAt = *req.StartAt
	}
	if req.EndAt != nil {
		endAt = *req.EndAt
	}
	if err := validatePromotionWindow(startAt, endAt); err != nil {
		return nil, err
	}
	promo.StartAt, promo.EndAt = startAt, endAt
	if req.Status != nil {
		if *req.Status != mallmodel.PromotionStatusEnabled && *req.Status != mallmodel.PromotionStatusDisabled {
			return nil, errors.New("状态仅支持 1启用 2停用")
		}
		promo.Status = *req.Status
	}
	if err := s.promoRepo.Update(ctx, promo,
		"name", "product_id", "promo_price", "start_at", "end_at", "status"); err != nil {
		return nil, err
	}
	return promo, nil
}

// AdminList 管理端分页(status/keyword/product_id 筛选)。
func (s *PromotionService) AdminList(ctx context.Context, page, pageSize int, status *int8, keyword string, productID uint) ([]mallmodel.MallPromotion, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if status != nil && *status > 0 {
		where["status"] = *status
	}
	if productID > 0 {
		where["product_id"] = productID
	}
	if len(where) > 0 {
		q.Where = where
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	return s.promoRepo.PageList(ctx, page, pageSize, q)
}

// AdminDelete 软删。历史订单价格快照不受影响。
func (s *PromotionService) AdminDelete(ctx context.Context, id uint) error {
	if _, err := s.promoRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "活动不存在")
	}
	return s.promoRepo.Delete(ctx, id)
}
