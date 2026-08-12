package service

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
	apprrepo "qzt-go-server/internal/repository/approval"
	psirepo "qzt-go-server/internal/repository/psi"
)

// purchase.go 采购管理:采购订单 + 采购退货 + 执行入库/退货出库。

// 来源单据类型(写库存流水时关联用)。
const (
	BizOrderPurchaseOrder  = "PURCHASE_ORDER"
	BizOrderPurchaseReturn = "PURCHASE_RETURN"
	BizOrderSalesOrder     = "SALES_ORDER"
	BizOrderSalesReturn    = "SALES_RETURN"
	BizOrderStockIn        = "STOCK_IN_ORDER"
	BizOrderStockOut       = "STOCK_OUT_ORDER"
)

// PurchaseService 采购服务。
type PurchaseService struct {
	orderRepo        *psirepo.PurchaseOrderRepo
	orderDetailRepo  *psirepo.PurchaseOrderDetailRepo
	returnRepo       *psirepo.PurchaseReturnRepo
	returnDetailRepo *psirepo.PurchaseReturnDetailRepo
	stockSvc         *StockService
}

func NewPurchaseService() *PurchaseService {
	return &PurchaseService{
		orderRepo:        psirepo.NewPurchaseOrderRepo(),
		orderDetailRepo:  psirepo.NewPurchaseOrderDetailRepo(),
		returnRepo:       psirepo.NewPurchaseReturnRepo(),
		returnDetailRepo: psirepo.NewPurchaseReturnDetailRepo(),
		stockSvc:         NewStockService(),
	}
}

// ── 采购订单 ──

// PurchaseOrderItemRequest 采购单明细项。
type PurchaseOrderItemRequest struct {
	ProductID uint            `json:"product_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity" binding:"required"`
	UnitPrice decimal.Decimal `json:"unit_price"`
	Remark    string          `json:"remark"`
}

// CreatePurchaseOrderRequest 创建采购单请求。
type CreatePurchaseOrderRequest struct {
	SupplierID      uint                      `json:"supplier_id" binding:"required"`
	WarehouseID     uint                      `json:"warehouse_id" binding:"required"`
	OrderDate       string                    `json:"order_date"`
	ExpectedDate    string                    `json:"expected_date"`
	DiscountAmount  decimal.Decimal           `json:"discount_amount"`
	Remark          string                    `json:"remark"`
	Items           []PurchaseOrderItemRequest `json:"items" binding:"required,min=1,dive"`
}

// PurchaseOrderDetailDTO 采购单详情含明细。
type PurchaseOrderDetailDTO struct {
	psimodel.PsiPurchaseOrder
	Items []psimodel.PsiPurchaseOrderDetail `json:"items"`
}

// Create 创建采购单(默认 status=待入库,approval_status=NONE),系统生成单号,自动汇总金额。
func (s *PurchaseService) Create(ctx context.Context, req *CreatePurchaseOrderRequest, operatorID *uint) (*psimodel.PsiPurchaseOrder, error) {
	order := &psimodel.PsiPurchaseOrder{
		OrderNo:        genOrderNo(prefixPurchaseOrder),
		SupplierID:     req.SupplierID,
		WarehouseID:    req.WarehouseID,
		ExpectedDate:   parseNullDate(req.ExpectedDate),
		DiscountAmount: req.DiscountAmount,
		Status:         psimodel.PurchaseStatusDraft,
		ApprovalStatus: psimodel.ApprovalNone,
		OperatorID:     operatorID,
		Remark:         req.Remark,
	}
	order.OrderDate = parseNullDate(req.OrderDate)

	// 汇总金额/数量 + 构造明细
	var totalQty, totalAmt decimal.Decimal
	details := make([]psimodel.PsiPurchaseOrderDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitPrice)
		totalQty = totalQty.Add(it.Quantity)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiPurchaseOrderDetail{
			ProductID: it.ProductID, Quantity: it.Quantity, ReceivedQuantity: decimal.Zero,
			UnitPrice: it.UnitPrice, Amount: amt, Remark: it.Remark,
		})
	}
	order.TotalQuantity = totalQty
	order.TotalAmount = totalAmt

	// 事务:创建主表 + 明细
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

// GetByID 采购单详情(含明细)。
func (s *PurchaseService) GetByID(ctx context.Context, id uint) (*PurchaseOrderDetailDTO, error) {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "采购单不存在")
	}
	items, err := s.orderDetailRepo.ListByOrder(ctx, id)
	if err != nil {
		return nil, err
	}
	return &PurchaseOrderDetailDTO{PsiPurchaseOrder: *o, Items: items}, nil
}

// Update 更新采购单(仅 status=待入库 且 approval_status 未进入审批时允许)。
// 重新计算汇总金额,先删后建明细。
func (s *PurchaseService) Update(ctx context.Context, id uint, req *CreatePurchaseOrderRequest) error {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "采购单不存在")
	}
	if o.Status != psimodel.PurchaseStatusDraft {
		return errors.New("采购单已入库,不可修改")
	}
	if o.ApprovalStatus == psimodel.ApprovalApproving {
		return errors.New("采购单审批中,不可修改")
	}

	o.SupplierID = req.SupplierID
	o.WarehouseID = req.WarehouseID
	o.OrderDate = parseNullDate(req.OrderDate)
	o.ExpectedDate = parseNullDate(req.ExpectedDate)
	o.DiscountAmount = req.DiscountAmount
	o.Remark = req.Remark

	var totalQty, totalAmt decimal.Decimal
	details := make([]psimodel.PsiPurchaseOrderDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitPrice)
		totalQty = totalQty.Add(it.Quantity)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiPurchaseOrderDetail{
			OrderID: id, ProductID: it.ProductID, Quantity: it.Quantity, ReceivedQuantity: decimal.Zero,
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

// Delete 删除采购单(仅待入库且未审批)。
func (s *PurchaseService) Delete(ctx context.Context, id uint) error {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "采购单不存在")
	}
	if o.Status != psimodel.PurchaseStatusDraft {
		return errors.New("采购单已入库,不可删除")
	}
	if apprrepo.HasInstance(ctx, "PURCHASE_ORDER", id) {
		return errors.New("采购单已进入审批流程,不能删除")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.orderDetailRepo.DeleteByOrder(ctx, id); err != nil {
			return err
		}
		return s.orderRepo.Delete(ctx, id)
	})
}

// List 采购单列表(分页 + 关键字单号 + 供应商/状态/审批状态过滤)。
func (s *PurchaseService) List(ctx context.Context, page, pageSize int, keyword string, supplierID uint, status int8, approvalStatus string) ([]psimodel.PsiPurchaseOrder, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"order_no": keyword}
	}
	if supplierID > 0 {
		where["supplier_id"] = supplierID
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

// StockIn 执行采购入库(审批通过后调用)。逐明细生成入库流水,更新结余。
// 重复入库校验:已存在该单的流水则拒绝。
func (s *PurchaseService) StockIn(ctx context.Context, id uint, operatorID *uint) error {
	o, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "采购单不存在")
	}
	// 校验审批状态(允许 APPROVED;若未启用审批流程则也允许直接入库)
	if o.ApprovalStatus != psimodel.ApprovalApproved && o.ApprovalStatus != psimodel.ApprovalNone {
		return errors.New("采购单未审批通过,不可入库")
	}
	if o.Status != psimodel.PurchaseStatusDraft {
		return errors.New("采购单已入库,无需重复操作")
	}
	// 防重复流水
	exist, err := s.stockSvc.movementExists(ctx, BizOrderPurchaseOrder, id)
	if err != nil {
		return err
	}
	if exist {
		return errors.New("采购单已产生入库流水,不可重复入库")
	}

	items, err := s.orderDetailRepo.ListByOrder(ctx, id)
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return errors.New("采购单无明细,不可入库")
	}

	inputs := make([]*MovementInput, 0, len(items))
	for i := range items {
		it := &items[i]
		inputs = append(inputs, &MovementInput{
			BizType: psimodel.BizPurchaseIn, BizOrderType: BizOrderPurchaseOrder,
			BizOrderID: &id, BizOrderNo: o.OrderNo,
			ProductID: it.ProductID, WarehouseID: o.WarehouseID,
			Quantity: it.Quantity, Direction: 1, UnitCost: it.UnitPrice,
			OperatorID: operatorID, Remark: "采购入库 " + o.OrderNo,
		})
	}
	if err := s.stockSvc.applyMany(ctx, inputs); err != nil {
		return err
	}
	// 更新单据状态为已入库
	o.Status = psimodel.PurchaseStatusReceipt
	return s.orderRepo.Update(ctx, o)
}

// ── 采购退货 ──

// CreatePurchaseReturnRequest 创建采购退货请求。
type CreatePurchaseReturnRequest struct {
	OrderID     *uint                       `json:"order_id"`
	SupplierID  uint                        `json:"supplier_id" binding:"required"`
	WarehouseID uint                        `json:"warehouse_id" binding:"required"`
	ReturnDate  string                      `json:"return_date"`
	Remark      string                      `json:"remark"`
	Items       []PurchaseOrderItemRequest   `json:"items" binding:"required,min=1,dive"`
}

// PurchaseReturnDetailDTO 采购退货详情含明细。
type PurchaseReturnDetailDTO struct {
	psimodel.PsiPurchaseReturn
	Items []psimodel.PsiPurchaseReturnDetail `json:"items"`
}

// CreateReturn 创建采购退货单(退货给供应商,从仓库出库)。
func (s *PurchaseService) CreateReturn(ctx context.Context, req *CreatePurchaseReturnRequest, operatorID *uint) (*psimodel.PsiPurchaseReturn, error) {
	ret := &psimodel.PsiPurchaseReturn{
		ReturnNo:       genOrderNo(prefixPurchaseReturn),
		OrderID:        req.OrderID,
		SupplierID:     req.SupplierID,
		WarehouseID:    req.WarehouseID,
		ReturnDate:     parseNullDate(req.ReturnDate),
		Status:         psimodel.ReturnStatusDraft,
		ApprovalStatus: psimodel.ApprovalNone,
		OperatorID:     operatorID,
		Remark:         req.Remark,
	}
	var totalAmt decimal.Decimal
	details := make([]psimodel.PsiPurchaseReturnDetail, 0, len(req.Items))
	for _, it := range req.Items {
		amt := it.Quantity.Mul(it.UnitPrice)
		totalAmt = totalAmt.Add(amt)
		details = append(details, psimodel.PsiPurchaseReturnDetail{
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

// GetReturnByID 采购退货详情(含明细)。
func (s *PurchaseService) GetReturnByID(ctx context.Context, id uint) (*PurchaseReturnDetailDTO, error) {
	r, err := s.returnRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "采购退货单不存在")
	}
	items, err := s.returnDetailRepo.ListByReturn(ctx, id)
	if err != nil {
		return nil, err
	}
	return &PurchaseReturnDetailDTO{PsiPurchaseReturn: *r, Items: items}, nil
}

// ListReturns 采购退货列表。
func (s *PurchaseService) ListReturns(ctx context.Context, page, pageSize int, keyword string, supplierID uint, status int8) ([]psimodel.PsiPurchaseReturn, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"return_no": keyword}
	}
	if supplierID > 0 {
		where["supplier_id"] = supplierID
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.returnRepo.PageList(ctx, page, pageSize, q)
}

// StockOutReturn 执行采购退货出库(审批通过后)。退货即从仓库出库。
func (s *PurchaseService) StockOutReturn(ctx context.Context, id uint, operatorID *uint) error {
	r, err := s.returnRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "采购退货单不存在")
	}
	if r.ApprovalStatus != psimodel.ApprovalApproved && r.ApprovalStatus != psimodel.ApprovalNone {
		return errors.New("采购退货单未审批通过,不可出库")
	}
	if r.Status != psimodel.ReturnStatusDraft {
		return errors.New("采购退货单已完成,无需重复操作")
	}
	exist, err := s.stockSvc.movementExists(ctx, BizOrderPurchaseReturn, id)
	if err != nil {
		return err
	}
	if exist {
		return errors.New("采购退货单已产生出库流水,不可重复操作")
	}
	items, err := s.returnDetailRepo.ListByReturn(ctx, id)
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return errors.New("采购退货单无明细,不可出库")
	}
	inputs := make([]*MovementInput, 0, len(items))
	for i := range items {
		it := &items[i]
		inputs = append(inputs, &MovementInput{
			BizType: psimodel.BizPurchaseReturnOut, BizOrderType: BizOrderPurchaseReturn,
			BizOrderID: &id, BizOrderNo: r.ReturnNo,
			ProductID: it.ProductID, WarehouseID: r.WarehouseID,
			Quantity: it.Quantity, Direction: -1, UnitCost: it.UnitPrice,
			OperatorID: operatorID, Remark: "采购退货出库 " + r.ReturnNo,
		})
	}
	if err := s.stockSvc.applyMany(ctx, inputs); err != nil {
		return err
	}
	r.Status = psimodel.ReturnStatusDone
	return s.returnRepo.Update(ctx, r)
}
