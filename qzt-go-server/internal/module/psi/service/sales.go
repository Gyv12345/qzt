package service

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
)

// sales.go 销售管理:销售订单 + 销售退货 + 执行出库/退货入库。
// 与采购对称,差别:关联客户(crm_customer)而非供应商;出库扣减库存(需校验余额)。

// SalesService 销售服务。
type SalesService struct {
	orderRepo        *psirepo.SalesOrderRepo
	orderDetailRepo  *psirepo.SalesOrderDetailRepo
	returnRepo       *psirepo.SalesReturnRepo
	returnDetailRepo *psirepo.SalesReturnDetailRepo
	stockSvc         *StockService
}

func NewSalesService() *SalesService {
	return &SalesService{
		orderRepo:        psirepo.NewSalesOrderRepo(),
		orderDetailRepo:  psirepo.NewSalesOrderDetailRepo(),
		returnRepo:       psirepo.NewSalesReturnRepo(),
		returnDetailRepo: psirepo.NewSalesReturnDetailRepo(),
		stockSvc:         NewStockService(),
	}
}

// ── 销售订单 ──

// SalesOrderItemRequest 销售单明细项(复用采购的明细结构,字段一致)。
type SalesOrderItemRequest = PurchaseOrderItemRequest

// CreateSalesOrderRequest 创建销售单请求。
type CreateSalesOrderRequest struct {
	CustomerID     uint                     `json:"customer_id" binding:"required"`
	ContractID     *uint                    `json:"contract_id"`
	WarehouseID    uint                     `json:"warehouse_id" binding:"required"`
	OrderDate      string                   `json:"order_date"`
	DiscountAmount decimal.Decimal          `json:"discount_amount"`
	Remark         string                   `json:"remark"`
	Items          []SalesOrderItemRequest  `json:"items" binding:"required,min=1,dive"`
}

// SalesOrderDetailDTO 销售单详情含明细。
type SalesOrderDetailDTO struct {
	psimodel.PsiSalesOrder
	Items []psimodel.PsiSalesOrderDetail `json:"items"`
}

// Create 创建销售单(默认 status=待出库,approval_status=NONE)。
func (s *SalesService) Create(ctx context.Context, req *CreateSalesOrderRequest, operatorID *uint) (*psimodel.PsiSalesOrder, error) {
	order := &psimodel.PsiSalesOrder{
		OrderNo:        genOrderNo(prefixSalesOrder),
		CustomerID:     req.CustomerID,
		ContractID:     req.ContractID,
		WarehouseID:    req.WarehouseID,
		OrderDate:      parseNullDate(req.OrderDate),
		DiscountAmount: req.DiscountAmount,
		Status:         psimodel.SalesStatusDraft,
		ApprovalStatus: psimodel.ApprovalNone,
		OperatorID:     operatorID,
		Remark:         req.Remark,
	}

	var totalQty, totalAmt decimal.Decimal
	details := make([]psimodel.PsiSalesOrderDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitPrice)
		totalQty = totalQty.Add(it.Quantity)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiSalesOrderDetail{
			ProductID: it.ProductID, Quantity: it.Quantity, DeliveredQuantity: decimal.Zero,
			UnitPrice: it.UnitPrice, Amount: amt, Remark: it.Remark,
		})
	}
	order.TotalQuantity = totalQty
	order.TotalAmount = totalAmt

	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.orderRepo.Create(ctx, order); err != nil {
			return err
		}
		for i := range details {
			details[i].OrderID = order.ID
			if err := s.orderDetailRepo.Create(ctx, &details[i]); err != nil {
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

// GetByID 销售单详情(含明细)。
func (s *SalesService) GetByID(ctx context.Context, id uint) (*SalesOrderDetailDTO, error) {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "销售单不存在")
	}
	items, err := s.orderDetailRepo.ListByOrder(ctx, id)
	if err != nil {
		return nil, err
	}
	return &SalesOrderDetailDTO{PsiSalesOrder: *o, Items: items}, nil
}

// Update 更新销售单(仅待出库且未进入审批)。
func (s *SalesService) Update(ctx context.Context, id uint, req *CreateSalesOrderRequest) error {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "销售单不存在")
	}
	if o.Status != psimodel.SalesStatusDraft {
		return errors.New("销售单已出库,不可修改")
	}
	if o.ApprovalStatus == psimodel.ApprovalApproving {
		return errors.New("销售单审批中,不可修改")
	}

	o.CustomerID = req.CustomerID
	o.ContractID = req.ContractID
	o.WarehouseID = req.WarehouseID
	o.OrderDate = parseNullDate(req.OrderDate)
	o.DiscountAmount = req.DiscountAmount
	o.Remark = req.Remark

	var totalQty, totalAmt decimal.Decimal
	details := make([]psimodel.PsiSalesOrderDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitPrice)
		totalQty = totalQty.Add(it.Quantity)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiSalesOrderDetail{
			OrderID: id, ProductID: it.ProductID, Quantity: it.Quantity, DeliveredQuantity: decimal.Zero,
			UnitPrice: it.UnitPrice, Amount: amt, Remark: it.Remark,
		})
	}
	o.TotalQuantity = totalQty
	o.TotalAmount = totalAmt

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.orderRepo.Update(ctx, o); err != nil {
			return err
		}
		if err := s.orderDetailRepo.DeleteByOrder(ctx, id); err != nil {
			return err
		}
		for i := range details {
			if err := s.orderDetailRepo.Create(ctx, &details[i]); err != nil {
				return err
			}
		}
		return nil
	})
}

// Delete 删除销售单(仅待出库且未审批)。
func (s *SalesService) Delete(ctx context.Context, id uint) error {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "销售单不存在")
	}
	if o.Status != psimodel.SalesStatusDraft {
		return errors.New("销售单已出库,不可删除")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.orderDetailRepo.DeleteByOrder(ctx, id); err != nil {
			return err
		}
		return s.orderRepo.Delete(ctx, id)
	})
}

// List 销售单列表。
func (s *SalesService) List(ctx context.Context, page, pageSize int, keyword string, customerID uint, status int8, approvalStatus string) ([]psimodel.PsiSalesOrder, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"order_no": keyword}
	}
	if customerID > 0 {
		where["customer_id"] = customerID
	}
	if status > 0 {
		where["status"] = status
	}
	if approvalStatus != "" {
		where["approval_status"] = approvalStatus
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.orderRepo.PageList(ctx, page, pageSize, q)
}

// StockOut 执行销售出库(审批通过后)。逐明细生成出库流水,扣减结余。
func (s *SalesService) StockOut(ctx context.Context, id uint, operatorID *uint) error {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "销售单不存在")
	}
	if o.ApprovalStatus != psimodel.ApprovalApproved && o.ApprovalStatus != psimodel.ApprovalNone {
		return errors.New("销售单未审批通过,不可出库")
	}
	if o.Status != psimodel.SalesStatusDraft {
		return errors.New("销售单已出库,无需重复操作")
	}
	exist, err := s.stockSvc.movementExists(ctx, BizOrderSalesOrder, id)
	if err != nil {
		return err
	}
	if exist {
		return errors.New("销售单已产生出库流水,不可重复出库")
	}

	items, err := s.orderDetailRepo.ListByOrder(ctx, id)
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return errors.New("销售单无明细,不可出库")
	}

	// 预校验库存充足(提前给出明确错误,避免部分出库后回滚)
	for i := range items {
		bal, err := s.stockSvc.GetBalance(ctx, items[i].ProductID, o.WarehouseID)
		if err != nil {
			return err
		}
		if bal.LessThan(items[i].Quantity) {
			return errors.New("商品库存不足,无法出库")
		}
	}

	inputs := make([]*MovementInput, 0, len(items))
	for i := range items {
		it := &items[i]
		inputs = append(inputs, &MovementInput{
			BizType: psimodel.BizSalesOut, BizOrderType: BizOrderSalesOrder,
			BizOrderID: &id, BizOrderNo: o.OrderNo,
			ProductID: it.ProductID, WarehouseID: o.WarehouseID,
			Quantity: it.Quantity, Direction: -1, UnitCost: it.UnitPrice,
			OperatorID: operatorID, Remark: "销售出库 " + o.OrderNo,
		})
	}
	if err := s.stockSvc.applyMany(ctx, inputs); err != nil {
		return err
	}
	o.Status = psimodel.SalesStatusShipped
	return s.orderRepo.Update(ctx, o)
}

// ── 销售退货 ──

// CreateSalesReturnRequest 创建销售退货请求。
type CreateSalesReturnRequest struct {
	OrderID     *uint                      `json:"order_id"`
	CustomerID  uint                       `json:"customer_id" binding:"required"`
	WarehouseID uint                       `json:"warehouse_id" binding:"required"`
	ReturnDate  string                     `json:"return_date"`
	Remark      string                     `json:"remark"`
	Items       []SalesOrderItemRequest    `json:"items" binding:"required,min=1,dive"`
}

// SalesReturnDetailDTO 销售退货详情含明细。
type SalesReturnDetailDTO struct {
	psimodel.PsiSalesReturn
	Items []psimodel.PsiSalesReturnDetail `json:"items"`
}

// CreateReturn 创建销售退货单(客户退回,入库到仓库)。
func (s *SalesService) CreateReturn(ctx context.Context, req *CreateSalesReturnRequest, operatorID *uint) (*psimodel.PsiSalesReturn, error) {
	ret := &psimodel.PsiSalesReturn{
		ReturnNo:       genOrderNo(prefixSalesReturn),
		OrderID:        req.OrderID,
		CustomerID:     req.CustomerID,
		WarehouseID:    req.WarehouseID,
		ReturnDate:     parseNullDate(req.ReturnDate),
		Status:         psimodel.ReturnStatusDraft,
		ApprovalStatus: psimodel.ApprovalNone,
		OperatorID:     operatorID,
		Remark:         req.Remark,
	}
	var totalAmt decimal.Decimal
	details := make([]psimodel.PsiSalesReturnDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitPrice)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiSalesReturnDetail{
			ProductID: it.ProductID, Quantity: it.Quantity, UnitPrice: it.UnitPrice, Amount: amt, Remark: it.Remark,
		})
	}
	ret.TotalAmount = totalAmt

	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.returnRepo.Create(ctx, ret); err != nil {
			return err
		}
		for i := range details {
			details[i].ReturnID = ret.ID
			if err := s.returnDetailRepo.Create(ctx, &details[i]); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return ret, nil
}

// GetReturnByID 销售退货详情(含明细)。
func (s *SalesService) GetReturnByID(ctx context.Context, id uint) (*SalesReturnDetailDTO, error) {
	r, err := s.returnRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "销售退货单不存在")
	}
	items, err := s.returnDetailRepo.ListByReturn(ctx, id)
	if err != nil {
		return nil, err
	}
	return &SalesReturnDetailDTO{PsiSalesReturn: *r, Items: items}, nil
}

// ListReturns 销售退货列表。
func (s *SalesService) ListReturns(ctx context.Context, page, pageSize int, keyword string, customerID uint, status int8) ([]psimodel.PsiSalesReturn, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"return_no": keyword}
	}
	if customerID > 0 {
		where["customer_id"] = customerID
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.returnRepo.PageList(ctx, page, pageSize, q)
}

// StockInReturn 执行销售退货入库(审批通过后)。退货即入库。
func (s *SalesService) StockInReturn(ctx context.Context, id uint, operatorID *uint) error {
	r, err := s.returnRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "销售退货单不存在")
	}
	if r.ApprovalStatus != psimodel.ApprovalApproved && r.ApprovalStatus != psimodel.ApprovalNone {
		return errors.New("销售退货单未审批通过,不可入库")
	}
	if r.Status != psimodel.ReturnStatusDraft {
		return errors.New("销售退货单已完成,无需重复操作")
	}
	exist, err := s.stockSvc.movementExists(ctx, BizOrderSalesReturn, id)
	if err != nil {
		return err
	}
	if exist {
		return errors.New("销售退货单已产生入库流水,不可重复操作")
	}
	items, err := s.returnDetailRepo.ListByReturn(ctx, id)
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return errors.New("销售退货单无明细,不可入库")
	}
	inputs := make([]*MovementInput, 0, len(items))
	for i := range items {
		it := &items[i]
		inputs = append(inputs, &MovementInput{
			BizType: psimodel.BizSalesReturnIn, BizOrderType: BizOrderSalesReturn,
			BizOrderID: &id, BizOrderNo: r.ReturnNo,
			ProductID: it.ProductID, WarehouseID: r.WarehouseID,
			Quantity: it.Quantity, Direction: 1, UnitCost: it.UnitPrice,
			OperatorID: operatorID, Remark: "销售退货入库 " + r.ReturnNo,
		})
	}
	if err := s.stockSvc.applyMany(ctx, inputs); err != nil {
		return err
	}
	r.Status = psimodel.ReturnStatusDone
	return s.returnRepo.Update(ctx, r)
}
