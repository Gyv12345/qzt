package psi

import (
	"context"
	"time"

	"github.com/shopspring/decimal"

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
		Where: map[string]any{"biz_order_type": bizOrderType, "biz_order_id": bizOrderID},
	})
}

// SalesRankAgg 商品销量排行聚合行(按商品聚合销售出库流水)。
type SalesRankAgg struct {
	ProductID   uint            `json:"product_id"`
	SalesQty    decimal.Decimal `json:"sales_qty"`
	SalesAmount decimal.Decimal `json:"sales_amount"`
}

// SalesRank 商品销量排行:按销售出库流水聚合,按销量降序,limit<=0 不限条数。
// startDate/endDate 支持 yyyy-MM-dd HH:mm:ss 或 yyyy-MM-dd,解析失败则忽略该边界。
func (r *StockMovementRepo) SalesRank(ctx context.Context, warehouseID uint, startDate, endDate string, limit int) ([]SalesRankAgg, error) {
	db := repository.DBFrom(ctx).Table("psi_stock_movement").
		Select("product_id, SUM(out_qty) AS sales_qty, SUM(out_qty * unit_cost) AS sales_amount").
		Where("biz_type = ?", psimodel.BizSalesOut).
		Group("product_id").
		Order("sales_qty DESC")

	if warehouseID > 0 {
		db = db.Where("warehouse_id = ?", warehouseID)
	}
	if t := parseReportTime(startDate); t != nil {
		db = db.Where("created_at >= ?", t)
	}
	if t := parseReportTime(endDate); t != nil {
		db = db.Where("created_at <= ?", t)
	}
	if limit > 0 {
		db = db.Limit(limit)
	}

	var rows []SalesRankAgg
	if err := db.Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

// parseReportTime 解析报表日期参数(yyyy-MM-dd HH:mm:ss 或 yyyy-MM-dd),
// 为空/解析失败返回 nil(表示不过滤该边界)。仅供本包报表聚合查询用。
func parseReportTime(s string) *time.Time {
	if s == "" {
		return nil
	}
	for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return nil
}
