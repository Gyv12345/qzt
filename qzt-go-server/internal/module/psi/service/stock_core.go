package service

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	psirepo "qzt-go-server/internal/repository/psi"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// stock_core.go 库存核心:库存结余查询 + 出入库变动。
//
// applyMovement 是进销存的库存一致性关键:在一个事务内写入一条 append-only
// 流水(psi_stock_movement),并增减 psi_stock 结余。采购入库/销售出库/退货/
// 盘点 等所有库存变动都统一走这个方法,确保「流水」与「结余」永远一致。

// StockService 库存服务:结余查询 + 收发变动。
type StockService struct {
	stockRepo    *psirepo.StockRepo
	movementRepo *psirepo.StockMovementRepo
}

func NewStockService() *StockService {
	return &StockService{stockRepo: psirepo.NewStockRepo(), movementRepo: psirepo.NewStockMovementRepo()}
}

// StockListRow 库存结余列表行(含商品信息,由 handler 层 join crm_product 展示)。
type StockListRow struct {
	psimodel.PsiStock
	ProductName string `json:"product_name"`
	ProductNo   string `json:"product_no"`
	Unit        string `json:"unit"`
	Category    string `json:"category"`
}

// MovementInput 描述一次库存变动的输入。
type MovementInput struct {
	BizType      string          // PURCHASE_IN / SALES_OUT / ... 见 model/psi/constants.go
	BizOrderType string          // 来源单据类型(如 PSI_PURCHASE_ORDER)
	BizOrderID   *uint           // 来源单据ID(nil 表示无关联单据,如期初)
	BizOrderNo   string          // 来源单据编号
	ProductID    uint
	WarehouseID  uint
	Quantity     decimal.Decimal // 变动数量(始终为正,方向由 Direction 决定)
	Direction    int             // +1 入库 / -1 出库
	UnitCost     decimal.Decimal // 单位成本(入库场景记录)
	OperatorID   *uint
	Remark       string
}

// applyMovement 在单个事务内写入一条流水并增减结余,返回变动后的结余。
// 出库时若库存不足返回 ErrStockInsufficient。
// 该方法在调用方 ctx 的事务中执行(repository.Transaction 自动复用外层事务)。
func (s *StockService) applyMovement(ctx context.Context, in *MovementInput) (decimal.Decimal, error) {
	if in.Direction != 1 && in.Direction != -1 {
		return decimal.Zero, errors.New("库存变动方向无效")
	}
	if in.Quantity.IsNegative() {
		return decimal.Zero, errors.New("库存变动数量不能为负")
	}
	delta := in.Quantity.Mul(decimal.NewFromInt(int64(in.Direction)))
	if in.Direction < 0 {
		// 出库:先校验结余是否充足
		cur, err := s.stockRepo.GetByProductWarehouse(ctx, in.ProductID, in.WarehouseID)
		if err == nil && cur.Quantity.LessThan(in.Quantity) {
			return decimal.Zero, errors.New("库存不足")
		}
	}

	var balanceAfter decimal.Decimal
	if err := repository.Transaction(ctx, func(ctx context.Context) error {
		bal, err := s.stockRepo.UpsertAdjust(ctx, in.ProductID, in.WarehouseID, delta, decimal.Zero)
		if err != nil {
			return err
		}
		// 出库二次校验(并发安全场景下防御负库存)
		if in.Direction < 0 && bal.IsNegative() {
			return errors.New("库存不足")
		}
		balanceAfter = bal

		inQty, outQty := decimal.Zero, decimal.Zero
		if in.Direction > 0 {
			inQty = in.Quantity
		} else {
			outQty = in.Quantity
		}
		mv := &psimodel.PsiStockMovement{
			BizType:      in.BizType,
			BizOrderType: in.BizOrderType,
			BizOrderID:   in.BizOrderID,
			BizOrderNo:   in.BizOrderNo,
			ProductID:    in.ProductID,
			WarehouseID:  in.WarehouseID,
			InQty:        inQty,
			OutQty:       outQty,
			BalanceAfter: balanceAfter,
			UnitCost:     in.UnitCost,
			OperatorID:   in.OperatorID,
			Remark:       in.Remark,
		}
		if err := s.movementRepo.Create(ctx, mv); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return decimal.Zero, err
	}
	return balanceAfter, nil
}

// applyMany 批量变动(多明细,同一事务)。任一失败回滚全部。
func (s *StockService) applyMany(ctx context.Context, inputs []*MovementInput) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		for _, in := range inputs {
			if _, err := s.applyMovement(ctx, in); err != nil {
				xlogger.ErrorfCtx(ctx, "库存变动失败 biz_type=%s order_no=%s product=%d: %v",
					in.BizType, in.BizOrderNo, in.ProductID, err)
				return err
			}
		}
		return nil
	})
}

// movementExists 判断某来源单据是否已产生过流水(防重复出入库)。
func (s *StockService) movementExists(ctx context.Context, bizOrderType string, bizOrderID uint) (bool, error) {
	return s.movementRepo.ExistsByOrder(ctx, bizOrderType, bizOrderID)
}
