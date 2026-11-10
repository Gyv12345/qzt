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

// transfer.go 库存调拨单服务。
// 创建(在途,未动库存)→执行(出+入同一事务,数量守恒)→完成;
// 任一明细出库侧库存不足则整单回滚。防重复执行:状态机 + 流水已存在双重防御。

// BizOrderStockTransfer 流水来源单据类型(调拨)。
const BizOrderStockTransfer = "STOCK_TRANSFER"

// TransferService 库存调拨服务。
type TransferService struct {
	transferRepo     *psirepo.TransferRepo
	transferItemRepo *psirepo.TransferItemRepo
	stockSvc         *StockService
	warehouseSvc     *WarehouseService
}

func NewTransferService() *TransferService {
	return &TransferService{
		transferRepo:     psirepo.NewTransferRepo(),
		transferItemRepo: psirepo.NewTransferItemRepo(),
		stockSvc:         NewStockService(),
		warehouseSvc:     NewWarehouseService(),
	}
}

// TransferItemRequest 调拨明细项。
type TransferItemRequest struct {
	ProductID uint `json:"product_id" binding:"required"`
	// 规格SKU ID(0=自动解析商品默认规格;多规格商品必须指定)
	SkuID    uint            `json:"sku_id"`
	Quantity decimal.Decimal `json:"quantity" binding:"required"`
	Remark   string          `json:"remark"`
}

// CreateTransferRequest 创建调拨单请求(创建后在途,执行时才动库存)。
type CreateTransferRequest struct {
	FromWarehouseID uint                  `json:"from_warehouse_id" binding:"required"`
	ToWarehouseID   uint                  `json:"to_warehouse_id" binding:"required"`
	OrderDate       string                `json:"order_date"`
	Remark          string                `json:"remark"`
	Items           []TransferItemRequest `json:"items" binding:"required,min=1,dive"`
}

// TransferDetailDTO 调拨单详情(含明细)。
type TransferDetailDTO struct {
	psimodel.PsiStockTransfer
	Items []psimodel.PsiStockTransferItem `json:"items"`
}

// Create 创建调拨单(在途,不动库存)。
func (s *TransferService) Create(ctx context.Context, req *CreateTransferRequest, operatorID *uint) (*psimodel.PsiStockTransfer, error) {
	if req.FromWarehouseID == req.ToWarehouseID {
		return nil, errors.New("调出仓库与调入仓库不能相同")
	}
	if _, err := s.warehouseSvc.GetByID(ctx, req.FromWarehouseID); err != nil {
		return nil, errors.New("调出仓库不存在")
	}
	if _, err := s.warehouseSvc.GetByID(ctx, req.ToWarehouseID); err != nil {
		return nil, errors.New("调入仓库不存在")
	}
	order := &psimodel.PsiStockTransfer{
		TransferNo:      genOrderNo(prefixTransfer),
		FromWarehouseID: req.FromWarehouseID,
		ToWarehouseID:   req.ToWarehouseID,
		Status:          psimodel.TransferStatusInTransit,
		TransferDate:    parseOrderDateOnCreate(req.OrderDate),
		OperatorID:      operatorID,
		Remark:          req.Remark,
	}
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.transferRepo.Create(ctx, order); err != nil {
			return err
		}
		for _, it := range req.Items {
			if !it.Quantity.IsPositive() {
				return errors.New("调拨数量必须大于 0")
			}
			skuID, err := resolveSkuID(ctx, it.ProductID, it.SkuID)
			if err != nil {
				return err
			}
			item := &psimodel.PsiStockTransferItem{
				TransferID: order.ID,
				ProductID:  it.ProductID,
				SkuID:      skuID,
				Quantity:   it.Quantity,
				Remark:     it.Remark,
			}
			if err := s.transferItemRepo.Create(ctx, item); err != nil {
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

// Execute 执行调拨:同一事务内逐明细「调出仓出库 + 调入仓入库」,数量守恒;
// 任一步失败整单回滚(出库侧库存不足由 applyMovement 拦截)。
func (s *TransferService) Execute(ctx context.Context, id uint, operatorID *uint) (*psimodel.PsiStockTransfer, error) {
	order, err := s.transferRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "调拨单不存在")
	}
	if order.Status != psimodel.TransferStatusInTransit {
		return nil, errors.New("仅在途的调拨单可执行")
	}
	if exists, err := s.stockSvc.movementExists(ctx, BizOrderStockTransfer, id); err == nil && exists {
		return nil, errors.New("该调拨单已产生库存流水,禁止重复执行")
	}
	items, err := s.transferItemRepo.ListByTransfer(ctx, id)
	if err != nil {
		return nil, err
	}
	inputs := make([]*MovementInput, 0, len(items)*2)
	for i := range items {
		it := &items[i]
		// 调出仓出库
		inputs = append(inputs, &MovementInput{
			BizType:      psimodel.BizStockOut,
			BizOrderType: BizOrderStockTransfer,
			BizOrderID:   &order.ID,
			BizOrderNo:   order.TransferNo,
			ProductID:    it.ProductID,
			SkuID:        it.SkuID,
			WarehouseID:  order.FromWarehouseID,
			Quantity:     it.Quantity,
			Direction:    -1,
			OperatorID:   operatorID,
			Remark:       "调拨出库 " + order.TransferNo,
		})
		// 调入仓入库
		inputs = append(inputs, &MovementInput{
			BizType:      psimodel.BizStockIn,
			BizOrderType: BizOrderStockTransfer,
			BizOrderID:   &order.ID,
			BizOrderNo:   order.TransferNo,
			ProductID:    it.ProductID,
			SkuID:        it.SkuID,
			WarehouseID:  order.ToWarehouseID,
			Quantity:     it.Quantity,
			Direction:    1,
			OperatorID:   operatorID,
			Remark:       "调拨入库 " + order.TransferNo,
		})
	}
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.stockSvc.applyMany(ctx, inputs); err != nil {
			return err
		}
		order.Status = psimodel.TransferStatusDone
		order.ExecuteTime = xtime.NewNullDateTimeFromTime(time.Now())
		return s.transferRepo.Update(ctx, order)
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

// Cancel 作废调拨单(仅在途可作废;作废不产生任何库存变动)。
func (s *TransferService) Cancel(ctx context.Context, id uint) error {
	order, err := s.transferRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "调拨单不存在")
	}
	if order.Status != psimodel.TransferStatusInTransit {
		return errors.New("仅在途的调拨单可作废")
	}
	order.Status = psimodel.TransferStatusCanceled
	return s.transferRepo.Update(ctx, order)
}

// Delete 删除调拨单(仅已作废可删;已执行单有流水引用不允许删)。
func (s *TransferService) Delete(ctx context.Context, id uint) error {
	order, err := s.transferRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "调拨单不存在")
	}
	if order.Status != psimodel.TransferStatusCanceled {
		return errors.New("仅已作废的调拨单可删除")
	}
	return s.transferRepo.Delete(ctx, id)
}

// GetByID 调拨单详情(含明细,回填规格描述)。
func (s *TransferService) GetByID(ctx context.Context, id uint) (*TransferDetailDTO, error) {
	order, err := s.transferRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "调拨单不存在")
	}
	items, err := s.transferItemRepo.ListByTransfer(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := fillSkuSpec(ctx, len(items), func(i int) uint { return items[i].SkuID }, func(i int, spec string) { items[i].SkuSpec = spec }); err != nil {
		return nil, err
	}
	return &TransferDetailDTO{PsiStockTransfer: *order, Items: items}, nil
}

// List 调拨单列表(回填调出/调入仓库名)。
func (s *TransferService) List(ctx context.Context, page, pageSize int, fromWarehouseID, toWarehouseID uint, status int8) ([]psimodel.PsiStockTransfer, int64, error) {
	where := map[string]any{}
	if fromWarehouseID > 0 {
		where["from_warehouse_id"] = fromWarehouseID
	}
	if toWarehouseID > 0 {
		where["to_warehouse_id"] = toWarehouseID
	}
	if status > 0 {
		where["status"] = status
	}
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if len(where) > 0 {
		q.Where = where
	}
	list, total, err := s.transferRepo.PageList(ctx, page, pageSize, q)
	if err != nil {
		return nil, 0, err
	}
	ids := make([]uint, 0, len(list)*2)
	for i := range list {
		ids = append(ids, list[i].FromWarehouseID, list[i].ToWarehouseID)
	}
	whMap, err := fetchWarehouseNames(ctx, ids)
	if err != nil {
		return nil, 0, err
	}
	for i := range list {
		list[i].FromWarehouseName = whMap[list[i].FromWarehouseID]
		list[i].ToWarehouseName = whMap[list[i].ToWarehouseID]
	}
	return list, total, nil
}
