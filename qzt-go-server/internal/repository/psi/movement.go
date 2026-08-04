package psi

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// movement.go 库存流水 repository。流水 append-only,只 Create/查询,不更新不删除。

// StockMovementRepo 库存流水。
type StockMovementRepo struct {
	repository.BaseRepo[psimodel.PsiStockMovement]
}

func NewStockMovementRepo() *StockMovementRepo { return &StockMovementRepo{} }

// ExistsByOrder 判断某来源单据是否已产生过流水(用于防止重复出入库)。
// biz_order_type + biz_order_id 唯一标识一笔业务单据的出入库动作。
func (r *StockMovementRepo) ExistsByOrder(ctx context.Context, bizOrderType string, bizOrderID uint) (bool, error) {
	return r.Exists(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"biz_order_type": bizOrderType, "biz_order_id": bizOrderID},
	})
}

// ListByProduct 列出某商品的全部流水(收发明细,按时间倒序)。
func (r *StockMovementRepo) ListByProduct(ctx context.Context, productID uint) ([]psimodel.PsiStockMovement, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"product_id": productID},
		Order: []string{"id DESC"},
	})
}
