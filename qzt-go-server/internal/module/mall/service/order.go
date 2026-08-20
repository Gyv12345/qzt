package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	mallmodel "qzt-go-server/internal/model/mall"
	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/app"
	"qzt-go-server/internal/repository"
	crmrepo "qzt-go-server/internal/repository/crm"
	mallrepo "qzt-go-server/internal/repository/mall"
	psirepo "qzt-go-server/internal/repository/psi"
	psisvc "qzt-go-server/internal/module/psi/service"
)

// order.go 商城订单服务。
// 垂直商城定位:商品=crm_product 上架商品(价格 standard_price);下单自动生成
// PSI 销售单(复用 psisvc.SalesService.Create,散客客户按手机号在商城域内复用)。

// MallService 商城服务。
type MallService struct {
	orderRepo *mallrepo.OrderRepo
	itemRepo  *mallrepo.ItemRepo
	custRepo  *crmrepo.CustomerRepo
	prodRepo  *crmrepo.ProductRepo
	whRepo    *psirepo.WarehouseRepo
	salesRepo *psirepo.SalesOrderRepo
	salesSvc  *psisvc.SalesService
}

// NewMallService 构造。
func NewMallService() *MallService {
	return &MallService{
		orderRepo: mallrepo.NewOrderRepo(),
		itemRepo:  mallrepo.NewItemRepo(),
		custRepo:  crmrepo.NewCustomerRepo(),
		prodRepo:  crmrepo.NewProductRepo(),
		whRepo:    psirepo.NewWarehouseRepo(),
		salesRepo: psirepo.NewSalesOrderRepo(),
		salesSvc:  psisvc.NewSalesService(),
	}
}

// ── 公开(免鉴权) ──

// MallGoodsDTO 公开商品视图。不含成本价。
type MallGoodsDTO struct {
	ID            uint            `json:"id"`
	Name          string          `json:"name"`
	ProductNo     string          `json:"product_no"`
	Category      string          `json:"category"`
	Unit          string          `json:"unit"`
	StandardPrice decimal.Decimal `json:"standard_price"`
	ImageURL      string          `json:"image_url"`
	Description   string          `json:"description"`
	// 全仓库存汇总(只做"有货/无货"参考,不承诺精确)
	StockQty decimal.Decimal `json:"stock_qty"`
	InStock  bool            `json:"in_stock"`
}

// PublicGoods 商城商品列表:全部上架商品(SKU 少,一次拉取,上限 200)。
func (s *MallService) PublicGoods(ctx context.Context) ([]MallGoodsDTO, error) {
	products, err := s.prodRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": crmmodel.ProductStatusOn},
		Order: []string{"id ASC"},
	})
	if err != nil {
		return nil, err
	}
	if len(products) > 200 {
		products = products[:200]
	}

	// 全仓库存汇总(一次 group by)
	type stockRow struct {
		ProductID uint
		Qty       decimal.Decimal
	}
	var rows []stockRow
	if err := repository.DBFrom(ctx).
		Table(psimodel.PsiStock{}.TableName()).
		Select("product_id AS product_id, SUM(quantity) AS qty").
		Group("product_id").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	stockByProduct := make(map[uint]decimal.Decimal, len(rows))
	for _, r := range rows {
		stockByProduct[r.ProductID] = r.Qty
	}

	out := make([]MallGoodsDTO, 0, len(products))
	for _, p := range products {
		qty := stockByProduct[p.ID]
		out = append(out, MallGoodsDTO{
			ID: p.ID, Name: p.Name, ProductNo: p.ProductNo, Category: p.Category,
			Unit: p.Unit, StandardPrice: p.StandardPrice, ImageURL: p.ImageURL,
			Description: p.Description, StockQty: qty, InStock: qty.IsPositive(),
		})
	}
	return out, nil
}

// CreateOrderItemRequest 下单明细项。
type CreateOrderItemRequest struct {
	ProductID uint            `json:"product_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity" binding:"required"`
}

// CreateOrderRequest 公开下单请求。
type CreateOrderRequest struct {
	Items        []CreateOrderItemRequest `json:"items" binding:"required,min=1,max=50,dive"`
	ContactName  string                   `json:"contact_name" binding:"required"`
	ContactPhone string                   `json:"contact_phone" binding:"required"`
	Address      string                   `json:"address" binding:"required"`
	Remark       string                   `json:"remark"`
}

// CreateOrderResult 下单结果。
type CreateOrderResult struct {
	OrderNo    string          `json:"order_no"`
	TotalAmount decimal.Decimal `json:"total_amount"`
	Status     int8            `json:"status"`
	// 生成的 PSI 销售单号(无默认仓库时为空,后台可手动补生成)
	SalesOrderNo string `json:"sales_order_no"`
}

var phoneRegexp = regexp.MustCompile(`^1[3-9]\d{9}$`)

// CreateOrder 公开下单:校验 → 建商城订单(价格快照)→ 自动生成 PSI 销售单。
func (s *MallService) CreateOrder(ctx context.Context, req *CreateOrderRequest) (*CreateOrderResult, error) {
	req.ContactName = strings.TrimSpace(req.ContactName)
	req.ContactPhone = strings.TrimSpace(req.ContactPhone)
	req.Address = strings.TrimSpace(req.Address)
	if !phoneRegexp.MatchString(req.ContactPhone) {
		return nil, errors.New("手机号格式不正确")
	}

	// 商品校验与快照
	ids := make([]uint, 0, len(req.Items))
	qtyByProduct := make(map[uint]decimal.Decimal, len(req.Items))
	for _, it := range req.Items {
		if !it.Quantity.IsPositive() {
			return nil, errors.New("商品数量必须大于 0")
		}
		if it.Quantity.GreaterThan(decimal.NewFromInt(999)) {
			return nil, errors.New("单件商品数量不能超过 999")
		}
		ids = append(ids, it.ProductID)
		qtyByProduct[it.ProductID] = qtyByProduct[it.ProductID].Add(it.Quantity)
	}
	if len(ids) > len(qtyByProduct) {
		return nil, errors.New("订单内商品重复")
	}
	products, err := s.prodRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": crmmodel.ProductStatusOn},
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{ids}}},
	})
	if err != nil {
		return nil, err
	}
	if len(products) != len(ids) {
		return nil, errors.New("包含已下架或不存在的商品,请刷新后重试")
	}
	prodByID := make(map[uint]*crmmodel.CrmProduct, len(products))
	for i := range products {
		prodByID[products[i].ID] = &products[i]
	}

	// 计价
	var totalQty, totalAmt decimal.Decimal
	items := make([]mallmodel.MallOrderItem, 0, len(req.Items))
	for _, it := range req.Items {
		p := prodByID[it.ProductID]
		amt := it.Quantity.Mul(p.StandardPrice)
		totalQty = totalQty.Add(it.Quantity)
		totalAmt = totalAmt.Add(amt)
		items = append(items, mallmodel.MallOrderItem{
			ProductID: p.ID, ProductName: p.Name,
			Quantity: it.Quantity, UnitPrice: p.StandardPrice, Amount: amt,
		})
	}
	if totalAmt.GreaterThan(decimal.NewFromInt(1_000_000)) {
		return nil, errors.New("订单金额超出上限,请联系客服下单")
	}

	order := &mallmodel.MallOrder{
		OrderNo:       genOrderNo("MO"),
		ContactName:   req.ContactName,
		ContactPhone:  req.ContactPhone,
		Address:       req.Address,
		Remark:        req.Remark,
		TotalQuantity: totalQty,
		TotalAmount:   totalAmt,
		Status:        mallmodel.OrderStatusPending,
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		// 散客客户:按手机号在商城域内复用,无则创建公海客户
		customerID, err := s.ensureCustomer(ctx, req.ContactPhone, req.ContactName)
		if err != nil {
			return err
		}
		order.CustomerID = customerID

		if err := s.orderRepo.Create(ctx, order); err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
			if err := s.itemRepo.Create(ctx, &items[i]); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// 自动生成 PSI 销售单(默认仓库;失败不阻断下单,后台可手动补生成)
	result := &CreateOrderResult{
		OrderNo:     order.OrderNo,
		TotalAmount: order.TotalAmount,
		Status:      order.Status,
	}
	if salesNo, ok := s.tryGenerateSalesOrder(ctx, order, items, 0); ok {
		result.SalesOrderNo = salesNo
	}
	return result, nil
}

// ensureCustomer 商城散客:复用同手机号历史订单的客户,否则创建公海客户(source=MALL)。
func (s *MallService) ensureCustomer(ctx context.Context, phone, name string) (*uint, error) {
	prev, err := s.orderRepo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"contact_phone": phone},
		Order: []string{"id DESC"},
	})
	if err == nil && prev.CustomerID != nil {
		return prev.CustomerID, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	customer := &crmmodel.CrmCustomer{
		Name:    fmt.Sprintf("商城-%s", name),
		Source:  "MALL",
		Status:  crmmodel.CustomerStatusNormal,
		InPool:  crmmodel.InPoolPublic,
	}
	if err := s.custRepo.Create(ctx, customer); err != nil {
		return nil, err
	}
	return &customer.ID, nil
}

// tryGenerateSalesOrder 生成 PSI 销售单并回写关联。warehouseID=0 时取默认仓库,
// 无默认仓库返回 false(不阻断)。独立小事务,失败仅记日志。
func (s *MallService) tryGenerateSalesOrder(ctx context.Context, order *mallmodel.MallOrder, items []mallmodel.MallOrderItem, warehouseID uint) (string, bool) {
	if warehouseID == 0 {
		wh, err := s.whRepo.GetOne(ctx, &repository.QueryOptions{
			Where: map[string]any{"is_default": 1, "status": 1},
		})
		if err != nil {
			return "", false // 无默认仓库,跳过
		}
		warehouseID = wh.ID
	}
	if order.CustomerID == nil {
		return "", false
	}

	salesItems := make([]psisvc.SalesOrderItemRequest, 0, len(items))
	for _, it := range items {
		salesItems = append(salesItems, psisvc.SalesOrderItemRequest{
			ProductID: it.ProductID, Quantity: it.Quantity, UnitPrice: it.UnitPrice,
		})
	}
	salesOrder, err := s.salesSvc.Create(ctx, &psisvc.CreateSalesOrderRequest{
		CustomerID:  *order.CustomerID,
		WarehouseID: warehouseID,
		OrderDate:   time.Now().Format("2006-01-02"),
		Remark:      fmt.Sprintf("商城订单 %s(%s %s)", order.OrderNo, order.ContactName, order.ContactPhone),
		Items:       salesItems,
	}, nil)
	if err != nil {
		return "", false
	}
	// 先赋值再 Update:BaseRepo.Update 按 struct 非零值更新,顺序反了会丢列
	order.PsiOrderID = &salesOrder.ID
	if err := s.orderRepo.Update(ctx, order, "psi_order_id"); err != nil {
		order.PsiOrderID = nil
		return "", false
	}
	return salesOrder.OrderNo, true
}

// PublicOrderDTO 公开订单查询视图(凭订单号,只暴露最少信息)。
type PublicOrderDTO struct {
	OrderNo     string          `json:"order_no"`
	Status      int8            `json:"status"`
	StatusLabel string          `json:"status_label"`
	TotalAmount decimal.Decimal `json:"total_amount"`
	Items       []PublicOrderItemDTO `json:"items"`
	CreatedAt   string          `json:"created_at"`
}

// PublicOrderItemDTO 公开订单明细。
type PublicOrderItemDTO struct {
	ProductName string          `json:"product_name"`
	Quantity    decimal.Decimal `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Amount      decimal.Decimal `json:"amount"`
}

// GetByOrderNo 凭订单号查单(公开)。
func (s *MallService) GetByOrderNo(ctx context.Context, orderNo string) (*PublicOrderDTO, error) {
	order, err := s.orderRepo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"order_no": orderNo},
	})
	if err != nil {
		return nil, repository.NotFoundOr(err, "订单不存在")
	}
	items, err := s.itemRepo.ListByOrder(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	dto := &PublicOrderDTO{
		OrderNo:     order.OrderNo,
		Status:      order.Status,
		StatusLabel: OrderStatusLabel(order.Status),
		TotalAmount: order.TotalAmount,
		Items:       make([]PublicOrderItemDTO, 0, len(items)),
		CreatedAt:   order.CreatedAt.String(),
	}
	for _, it := range items {
		dto.Items = append(dto.Items, PublicOrderItemDTO{
			ProductName: it.ProductName, Quantity: it.Quantity,
			UnitPrice: it.UnitPrice, Amount: it.Amount,
		})
	}
	return dto, nil
}

// OrderStatusLabel 状态中文。
func OrderStatusLabel(status int8) string {
	switch status {
	case mallmodel.OrderStatusPending:
		return "待处理"
	case mallmodel.OrderStatusConfirmed:
		return "已确认"
	case mallmodel.OrderStatusFinished:
		return "已完成"
	case mallmodel.OrderStatusCancelled:
		return "已取消"
	}
	return "未知"
}

// ── 管理(后台) ──

// OrderDetailDTO 管理侧订单详情(含明细与关联信息)。
type OrderDetailDTO struct {
	mallmodel.MallOrder
	StatusLabel  string                 `json:"status_label"`
	Items        []mallmodel.MallOrderItem `json:"items"`
	CustomerName string                 `json:"customer_name"`
	SalesOrderNo string                 `json:"sales_order_no"`
}

// List 管理侧订单分页(status/keyword 筛选)。
func (s *MallService) List(ctx context.Context, page, pageSize int, status *int8, keyword string) ([]mallmodel.MallOrder, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"id DESC"},
	}
	if status != nil && *status > 0 {
		q.Where = map[string]any{"status": *status}
	}
	if keyword != "" {
		q.Search = map[string]string{
			"order_no":      keyword,
			"contact_name":  keyword,
			"contact_phone": keyword,
		}
	}
	return s.orderRepo.PageList(ctx, page, pageSize, q)
}

// GetByID 管理侧订单详情。
func (s *MallService) GetByID(ctx context.Context, id uint) (*OrderDetailDTO, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "订单不存在")
	}
	items, err := s.itemRepo.ListByOrder(ctx, id)
	if err != nil {
		return nil, err
	}
	dto := &OrderDetailDTO{
		MallOrder:   *order,
		StatusLabel: OrderStatusLabel(order.Status),
		Items:       items,
	}
	if order.CustomerID != nil {
		if c, err := s.custRepo.GetByID(ctx, *order.CustomerID); err == nil {
			dto.CustomerName = c.Name
		}
	}
	if order.PsiOrderID != nil {
		if so, err := s.salesRepo.GetByID(ctx, *order.PsiOrderID); err == nil {
			dto.SalesOrderNo = so.OrderNo
		}
	}
	return dto, nil
}

// UpdateStatus 状态流转。取消时若已生成销售单且未出库,同步关闭 PSI 销售单。
func (s *MallService) UpdateStatus(ctx context.Context, id uint, status int8) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "订单不存在")
	}
	if order.Status == mallmodel.OrderStatusCancelled {
		return errors.New("订单已取消")
	}
	if order.Status == mallmodel.OrderStatusFinished {
		return errors.New("订单已完成,不能变更")
	}
	// 合法流转:待处理→已确认/已取消;已确认→已完成/已取消
	allowed := false
	switch status {
	case mallmodel.OrderStatusConfirmed:
		allowed = order.Status == mallmodel.OrderStatusPending
	case mallmodel.OrderStatusFinished:
		allowed = order.Status == mallmodel.OrderStatusConfirmed
	case mallmodel.OrderStatusCancelled:
		allowed = order.Status == mallmodel.OrderStatusPending || order.Status == mallmodel.OrderStatusConfirmed
	}
	if !allowed {
		return fmt.Errorf("不允许从「%s」变更为「%s」", OrderStatusLabel(order.Status), OrderStatusLabel(status))
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		order.Status = status
		if err := s.orderRepo.Update(ctx, order, "status"); err != nil {
			return err
		}
		// 取消时同步关闭未出库的 PSI 销售单(已出库的保留,由仓库侧处理退货)
		if status == mallmodel.OrderStatusCancelled && order.PsiOrderID != nil {
			if so, err := s.salesRepo.GetByID(ctx, *order.PsiOrderID); err == nil && so.Status == psimodel.SalesStatusDraft {
				so.Status = psimodel.SalesStatusClosed
				if err := s.salesRepo.Update(ctx, so); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

// GenerateSalesOrder 手动生成 PSI 销售单(下单时无默认仓库的订单,后台选仓库补生成)。
func (s *MallService) GenerateSalesOrder(ctx context.Context, id uint, warehouseID uint) (string, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return "", repository.NotFoundOr(err, "订单不存在")
	}
	if order.PsiOrderID != nil {
		return "", errors.New("订单已生成销售单")
	}
	if order.Status == mallmodel.OrderStatusCancelled {
		return "", errors.New("订单已取消,不能生成销售单")
	}
	items, err := s.itemRepo.ListByOrder(ctx, id)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return "", errors.New("订单无明细")
	}
	if salesNo, ok := s.tryGenerateSalesOrder(ctx, order, items, warehouseID); ok {
		return salesNo, nil
	}
	return "", errors.New("生成销售单失败(请确认客户关联与仓库有效)")
}

// RateLimitOK IP 下单限流:每 IP 每分钟 5 单(Redis 固定窗口)。
func (s *MallService) RateLimitOK(ctx context.Context, ip string) bool {
	key := "mall:order:rl:" + ip
	n, err := app.Redis.Incr(ctx, key).Result()
	if err != nil {
		return true // Redis 异常时放行,不影响正常用户
	}
	if n == 1 {
		app.Redis.Expire(ctx, key, time.Minute)
	}
	return n <= 5
}

// number.go 商城订单号:MO + yyyyMMdd + 6 位纳秒尾(对齐 PSI 单号风格,DB 唯一索引兜底)。

func genOrderNo(prefix string) string {
	now := time.Now()
	return fmt.Sprintf("%s%s%06d", prefix, now.Format("20060102"), now.UnixNano()%1000000)
}
