package service

import (
	"context"
	"errors"
	"time"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
	"qzt-go-server/pkg/xtime"
)

// stocktake.go 库存盘点单服务。
// 与其他出入库单(创建即生效)不同,盘点走「创建冻结快照→录实盘→确认」三步:
// 确认时才按差异派生盘盈/盘亏流水(append-only),结余经 stock_core.applyMovement 变动。
// 同仓同时只允许一张盘点中的单,防止两张单的快照口径互相踩。

// BizOrderStocktake 流水来源单据类型(盘点)。
const BizOrderStocktake = "STOCKTAKE"

// StocktakeService 库存盘点服务。
type StocktakeService struct {
	stocktakeRepo     *psirepo.StocktakeRepo
	stocktakeItemRepo *psirepo.StocktakeItemRepo
	stockRepo         *psirepo.StockRepo
	stockSvc          *StockService
	warehouseSvc      *WarehouseService
}

func NewStocktakeService() *StocktakeService {
	return &StocktakeService{
		stocktakeRepo:     psirepo.NewStocktakeRepo(),
		stocktakeItemRepo: psirepo.NewStocktakeItemRepo(),
		stockRepo:         psirepo.NewStockRepo(),
		stockSvc:          NewStockService(),
		warehouseSvc:      NewWarehouseService(),
	}
}

// CreateStocktakeRequest 创建盘点单(选仓库,服务端冻结账面快照)。
type CreateStocktakeRequest struct {
	WarehouseID uint   `json:"warehouse_id" binding:"required"`
	Remark      string `json:"remark"`
}

// UpdateActualItem 录实盘明细项。
type UpdateActualItem struct {
	ItemID    uint                `json:"item_id" binding:"required"`
	ActualQty decimal.NullDecimal `json:"actual_qty" binding:"required"`
}

// UpdateActualRequest 录实盘请求(批量)。
type UpdateActualRequest struct {
	Items []UpdateActualItem `json:"items" binding:"required,min=1,dive"`
}

// Create 创建盘点单:冻结该仓全部结余行快照(含零结余),状态=盘点中。
func (s *StocktakeService) Create(ctx context.Context, req *CreateStocktakeRequest, operatorID *uint) (*psimodel.PsiStocktake, error) {
	if _, err := s.warehouseSvc.GetByID(ctx, req.WarehouseID); err != nil {
		return nil, errors.New("仓库不存在")
	}
	if ok, err := s.stocktakeRepo.ExistsOngoingByWarehouse(ctx, req.WarehouseID); err == nil && ok {
		return nil, errors.New("该仓库已有盘点中的盘点单,请先完成或作废")
	}
	stocks, err := s.stockRepo.ListByWarehouse(ctx, req.WarehouseID)
	if err != nil {
		return nil, err
	}
	if len(stocks) == 0 {
		return nil, errors.New("该仓库无库存结余,无可盘点数据")
	}
	order := &psimodel.PsiStocktake{
		StocktakeNo: genOrderNo(prefixStocktake),
		WarehouseID: req.WarehouseID,
		Status:      psimodel.StocktakeStatusOngoing,
		TakeDate:    xtime.NewNullDateTimeFromTime(time.Now()),
		OperatorID:  operatorID,
		Remark:      req.Remark,
	}
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.stocktakeRepo.Create(ctx, order); err != nil {
			return err
		}
		for i := range stocks {
			it := stocks[i]
			item := &psimodel.PsiStocktakeItem{
				StocktakeID: order.ID,
				ProductID:   it.ProductID,
				SkuID:       it.SkuID,
				ExpectedQty: it.Quantity, // 账面快照
			}
			if err := s.stocktakeItemRepo.Create(ctx, item); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

// UpdateActual 录实盘数(批量,允许重复录入以最后一次为准)。仅盘点中可录。
func (s *StocktakeService) UpdateActual(ctx context.Context, id uint, req *UpdateActualRequest) error {
	order, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "盘点单不存在")
	}
	if order.Status != psimodel.StocktakeStatusOngoing {
		return errors.New("仅盘点中的盘点单可录实盘")
	}
	items, err := s.stocktakeItemRepo.ListByStocktake(ctx, id)
	if err != nil {
		return err
	}
	itemMap := make(map[uint]*psimodel.PsiStocktakeItem, len(items))
	for i := range items {
		itemMap[items[i].ID] = &items[i]
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		for _, it := range req.Items {
			item, ok := itemMap[it.ItemID]
			if !ok {
				return errors.New("明细不存在或不属于该盘点单")
			}
			if !it.ActualQty.Valid {
				return errors.New("实盘数量无效")
			}
			if it.ActualQty.Decimal.IsNegative() {
				return errors.New("实盘数量不能为负")
			}
			item.ActualQty = it.ActualQty
			if err := s.stocktakeItemRepo.Update(ctx, item); err != nil {
				return err
			}
		}
		return nil
	})
}

// Confirm 确认盘点:逐明细计算差异,盘盈入库/盘亏出库派生流水,状态→已确认。
// 至少一条明细已录实盘才允许确认;盘亏出库若遇库存不足(期间他单已动账)会整单回滚,
// 提示先补记出库单后再盘。
func (s *StocktakeService) Confirm(ctx context.Context, id uint, operatorID *uint) (*psimodel.PsiStocktake, error) {
	order, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "盘点单不存在")
	}
	if order.Status != psimodel.StocktakeStatusOngoing {
		return nil, errors.New("仅盘点中的盘点单可确认")
	}
	items, err := s.stocktakeItemRepo.ListByStocktake(ctx, id)
	if err != nil {
		return nil, err
	}
	counted := 0
	inputs := make([]*MovementInput, 0, len(items))
	for i := range items {
		it := &items[i]
		if !it.ActualQty.Valid {
			continue
		}
		counted++
		mv, hasDiff := buildStocktakeMovement(order, it, operatorID)
		if hasDiff {
			inputs = append(inputs, mv)
		}
	}
	if counted == 0 {
		return nil, errors.New("请先录入实盘数再确认")
	}
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		for i := range items {
			if err := s.stocktakeItemRepo.Update(ctx, &items[i]); err != nil {
				return err
			}
		}
		if err := s.stockSvc.applyMany(ctx, inputs); err != nil {
			return err
		}
		order.Status = psimodel.StocktakeStatusDone
		order.ConfirmTime = xtime.NewNullDateTimeFromTime(time.Now())
		return s.stocktakeRepo.Update(ctx, order)
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

// buildStocktakeMovement 按明细差异构建盘点的库存变动输入(纯函数,便于单测)。
// 盘盈(actual>账面)入库、盘亏(actual<账面)出库;零差异不产生流水。
func buildStocktakeMovement(order *psimodel.PsiStocktake, it *psimodel.PsiStocktakeItem, operatorID *uint) (*MovementInput, bool) {
	diff := it.ActualQty.Decimal.Sub(it.ExpectedQty)
	it.DiffQty = diff
	if diff.IsZero() {
		return nil, false
	}
	mv := &MovementInput{
		BizType:      psimodel.BizStockIn,
		BizOrderType: BizOrderStocktake,
		BizOrderID:   &order.ID,
		BizOrderNo:   order.StocktakeNo,
		ProductID:    it.ProductID,
		SkuID:        it.SkuID,
		WarehouseID:  order.WarehouseID,
		OperatorID:   operatorID,
	}
	if diff.Sign() > 0 {
		mv.Direction = 1
		mv.Quantity = diff
		mv.Remark = "盘盈 " + order.StocktakeNo
	} else {
		mv.BizType = psimodel.BizStockOut
		mv.Direction = -1
		mv.Quantity = diff.Neg()
		mv.Remark = "盘亏 " + order.StocktakeNo
	}
	return mv, true
}

// Cancel 作废盘点单(仅盘点中可作废;作废不产生任何库存变动)。
func (s *StocktakeService) Cancel(ctx context.Context, id uint) error {
	order, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "盘点单不存在")
	}
	if order.Status != psimodel.StocktakeStatusOngoing {
		return errors.New("仅盘点中的盘点单可作废")
	}
	order.Status = psimodel.StocktakeStatusCanceled
	return s.stocktakeRepo.Update(ctx, order)
}

// Delete 删除盘点单(仅已作废可删;已确认单有流水引用不允许删)。
func (s *StocktakeService) Delete(ctx context.Context, id uint) error {
	order, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "盘点单不存在")
	}
	if order.Status != psimodel.StocktakeStatusCanceled {
		return errors.New("仅已作废的盘点单可删除")
	}
	return s.stocktakeRepo.Delete(ctx, id)
}

// StocktakeDetailDTO 盘点单详情(含明细,回填规格描述)。
type StocktakeDetailDTO struct {
	psimodel.PsiStocktake
	Items []psimodel.PsiStocktakeItem `json:"items"`
}

// GetByID 盘点单详情(含明细,回填规格描述)。
func (s *StocktakeService) GetByID(ctx context.Context, id uint) (*StocktakeDetailDTO, error) {
	order, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "盘点单不存在")
	}
	items, err := s.stocktakeItemRepo.ListByStocktake(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := fillSkuSpec(ctx, len(items), func(i int) uint { return items[i].SkuID }, func(i int, spec string) { items[i].SkuSpec = spec }); err != nil {
		return nil, err
	}
	return &StocktakeDetailDTO{PsiStocktake: *order, Items: items}, nil
}

// List 盘点单列表(回填仓库名)。
func (s *StocktakeService) List(ctx context.Context, page, pageSize int, warehouseID uint, status int8) ([]psimodel.PsiStocktake, int64, error) {
	where := map[string]any{}
	if warehouseID > 0 {
		where["warehouse_id"] = warehouseID
	}
	if status > 0 {
		where["status"] = status
	}
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if len(where) > 0 {
		q.Where = where
	}
	list, total, err := s.stocktakeRepo.PageList(ctx, page, pageSize, q)
	if err != nil {
		return nil, 0, err
	}
	ids := make([]uint, 0, len(list))
	for i := range list {
		ids = append(ids, list[i].WarehouseID)
	}
	whMap, err := fetchWarehouseNames(ctx, ids)
	if err != nil {
		return nil, 0, err
	}
	for i := range list {
		list[i].WarehouseName = whMap[list[i].WarehouseID]
	}
	return list, total, nil
}
