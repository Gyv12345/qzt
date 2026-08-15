package service

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
)

// stock_io.go 其他入库/出库服务(盘点盈亏、赠品、领用、损耗等)。
// 这类单据即时性强,创建即生效(直接出入库),无需审批。
// 重复生效由「单据状态=已生效」+「流水已存在」双重防御。

// StockIOService 其他出入库服务。
type StockIOService struct {
	inOrderRepo       *psirepo.StockInOrderRepo
	inOrderDetailRepo *psirepo.StockInOrderDetailRepo
	outOrderRepo      *psirepo.StockOutOrderRepo
	outOrderDetailRepo *psirepo.StockOutOrderDetailRepo
	stockSvc          *StockService
}

func NewStockIOService() *StockIOService {
	return &StockIOService{
		inOrderRepo:        psirepo.NewStockInOrderRepo(),
		inOrderDetailRepo:  psirepo.NewStockInOrderDetailRepo(),
		outOrderRepo:       psirepo.NewStockOutOrderRepo(),
		outOrderDetailRepo: psirepo.NewStockOutOrderDetailRepo(),
		stockSvc:           NewStockService(),
	}
}

// ── 其他入库 ──

// StockInItemRequest 其他入库明细项。
type StockInItemRequest struct {
	ProductID uint            `json:"product_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity" binding:"required"`
	UnitCost  decimal.Decimal `json:"unit_cost"`
	Remark    string          `json:"remark"`
}

// CreateStockInRequest 创建其他入库单请求。创建即生效。
type CreateStockInRequest struct {
	WarehouseID uint                  `json:"warehouse_id" binding:"required"`
	BizType     string                `json:"biz_type" binding:"required"` // INIT/PROFIT/GIFT/OTHER
	OrderDate   string                `json:"order_date"`
	Remark      string                `json:"remark"`
	Items       []StockInItemRequest  `json:"items" binding:"required,min=1,dive"`
}

// StockInDetailDTO 其他入库单详情含明细。
type StockInDetailDTO struct {
	psimodel.PsiStockInOrder
	Items []psimodel.PsiStockInOrderDetail `json:"items"`
}

// Create 创建其他入库单并立即生效(写流水+增结余)。
func (s *StockIOService) Create(ctx context.Context, req *CreateStockInRequest, operatorID *uint) (*psimodel.PsiStockInOrder, error) {
	if !isValidStockInType(req.BizType) {
		return nil, errors.New("无效的入库类型")
	}
	order := &psimodel.PsiStockInOrder{
		OrderNo:     genOrderNo(prefixStockIn),
		WarehouseID: req.WarehouseID,
		BizType:     req.BizType,
		OrderDate:   parseNullDate(req.OrderDate),
		Status:      psimodel.StockIOStatusDone,
		OperatorID:  operatorID,
		Remark:      req.Remark,
	}

	var totalAmt decimal.Decimal
	details := make([]psimodel.PsiStockInOrderDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitCost)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiStockInOrderDetail{
			ProductID: it.ProductID, Quantity: it.Quantity, UnitCost: it.UnitCost, Remark: it.Remark,
		})
	}
	order.TotalAmount = totalAmt

	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.inOrderRepo.Create(ctx, order); err != nil {
			return err
		}
		// 写明细
		for i := range details {
			details[i].OrderID = order.ID
			if err := s.inOrderDetailRepo.Create(ctx, &details[i]); err != nil {
				return err
			}
		}
		// 立即生效:逐明细入库
		inputs := make([]*MovementInput, 0, len(details))
		for i := range details {
			it := &details[i]
			inputs = append(inputs, &MovementInput{
				BizType: psimodel.BizStockIn, BizOrderType: BizOrderStockIn,
				BizOrderID: &order.ID, BizOrderNo: order.OrderNo,
				ProductID: it.ProductID, WarehouseID: order.WarehouseID,
				Quantity: it.Quantity, Direction: 1, UnitCost: it.UnitCost,
				OperatorID: operatorID, Remark: "其他入库 " + order.OrderNo,
			})
		}
		return s.stockSvc.applyMany(ctx, inputs)
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

// GetInByID 其他入库单详情(含明细)。
func (s *StockIOService) GetInByID(ctx context.Context, id uint) (*StockInDetailDTO, error) {
	o, err := s.inOrderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "入库单不存在")
	}
	items, err := s.inOrderDetailRepo.ListByOrder(ctx, id)
	if err != nil {
		return nil, err
	}
	return &StockInDetailDTO{PsiStockInOrder: *o, Items: items}, nil
}

// ListIn 其他入库单列表。
func (s *StockIOService) ListIn(ctx context.Context, page, pageSize int, warehouseID uint, bizType string) ([]psimodel.PsiStockInOrder, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if warehouseID > 0 {
		where["warehouse_id"] = warehouseID
	}
	if bizType != "" {
		where["biz_type"] = bizType
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.inOrderRepo.PageList(ctx, page, pageSize, q)
}

// ── 其他出库 ──

// StockOutItemRequest 其他出库明细项。
type StockOutItemRequest struct {
	ProductID uint            `json:"product_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity" binding:"required"`
	Remark    string          `json:"remark"`
}

// CreateStockOutRequest 创建其他出库单请求。创建即生效。
type CreateStockOutRequest struct {
	WarehouseID uint                   `json:"warehouse_id" binding:"required"`
	BizType     string                 `json:"biz_type" binding:"required"` // LOSS/SCRAP/USE/OTHER
	OrderDate   string                 `json:"order_date"`
	Remark      string                 `json:"remark"`
	Items       []StockOutItemRequest  `json:"items" binding:"required,min=1,dive"`
}

// StockOutDetailDTO 其他出库单详情含明细。
type StockOutDetailDTO struct {
	psimodel.PsiStockOutOrder
	Items []psimodel.PsiStockOutOrderDetail `json:"items"`
}

// Create 创建其他出库单并立即生效(写流水+减结余)。
func (s *StockIOService) CreateOut(ctx context.Context, req *CreateStockOutRequest, operatorID *uint) (*psimodel.PsiStockOutOrder, error) {
	if !isValidStockOutType(req.BizType) {
		return nil, errors.New("无效的出库类型")
	}
	order := &psimodel.PsiStockOutOrder{
		OrderNo:     genOrderNo(prefixStockOut),
		WarehouseID: req.WarehouseID,
		BizType:     req.BizType,
		OrderDate:   parseNullDate(req.OrderDate),
		Status:      psimodel.StockIOStatusDone,
		OperatorID:  operatorID,
		Remark:      req.Remark,
	}
	details := make([]psimodel.PsiStockOutOrderDetail, 0, len(req.Items))
	for _, it := range req.Items {
		details = append(details, psimodel.PsiStockOutOrderDetail{
			ProductID: it.ProductID, Quantity: it.Quantity, Remark: it.Remark,
		})
	}

	// 预校验库存
	for _, it := range req.Items {
		bal, err := s.stockSvc.GetBalance(ctx, it.ProductID, order.WarehouseID)
		if err != nil {
			return nil, err
		}
		if bal.LessThan(it.Quantity) {
			return nil, errors.New("商品库存不足,无法出库")
		}
	}

	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.outOrderRepo.Create(ctx, order); err != nil {
			return err
		}
		for i := range details {
			details[i].OrderID = order.ID
			if err := s.outOrderDetailRepo.Create(ctx, &details[i]); err != nil {
				return err
			}
		}
		inputs := make([]*MovementInput, 0, len(details))
		for i := range details {
			it := &details[i]
			inputs = append(inputs, &MovementInput{
				BizType: psimodel.BizStockOut, BizOrderType: BizOrderStockOut,
				BizOrderID: &order.ID, BizOrderNo: order.OrderNo,
				ProductID: it.ProductID, WarehouseID: order.WarehouseID,
				Quantity: it.Quantity, Direction: -1,
				OperatorID: operatorID, Remark: "其他出库 " + order.OrderNo,
			})
		}
		return s.stockSvc.applyMany(ctx, inputs)
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

// GetOutByID 其他出库单详情(含明细)。
func (s *StockIOService) GetOutByID(ctx context.Context, id uint) (*StockOutDetailDTO, error) {
	o, err := s.outOrderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "出库单不存在")
	}
	items, err := s.outOrderDetailRepo.ListByOrder(ctx, id)
	if err != nil {
		return nil, err
	}
	return &StockOutDetailDTO{PsiStockOutOrder: *o, Items: items}, nil
}

// ListOut 其他出库单列表。
func (s *StockIOService) ListOut(ctx context.Context, page, pageSize int, warehouseID uint, bizType string) ([]psimodel.PsiStockOutOrder, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if warehouseID > 0 {
		where["warehouse_id"] = warehouseID
	}
	if bizType != "" {
		where["biz_type"] = bizType
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.outOrderRepo.PageList(ctx, page, pageSize, q)
}

// isValidStockInType 校验其他入库子类型。
func isValidStockInType(t string) bool {
	switch t {
	case psimodel.StockInTypeInit, psimodel.StockInTypeProfit,
		psimodel.StockInTypeGift, psimodel.StockInTypeOther:
		return true
	}
	return false
}

// isValidStockOutType 校验其他出库子类型。
func isValidStockOutType(t string) bool {
	switch t {
	case psimodel.StockOutTypeLoss, psimodel.StockOutTypeScrap,
		psimodel.StockOutTypeUse, psimodel.StockOutTypeOther:
		return true
	}
	return false
}
