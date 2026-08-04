package service

import (
	"context"
	"time"

	"github.com/shopspring/decimal"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
)

// report.go 进销存报表服务:采购/销售汇总、商品销量排行、库存预警统计。
// 报表均为只读查询,基于 psi_stock_movement / psi_purchase_order / psi_sales_order 聚合。

// ReportService 报表服务。
type ReportService struct {
	movementRepo *psirepo.StockMovementRepo
	purchaseRepo *psirepo.PurchaseOrderRepo
}

func NewReportService() *ReportService {
	return &ReportService{
		movementRepo: psirepo.NewStockMovementRepo(),
		purchaseRepo: psirepo.NewPurchaseOrderRepo(),
	}
}

// SalesRankingRow 商品销量排行行。
type SalesRankingRow struct {
	ProductID   uint            `json:"product_id"`
	ProductName string          `json:"product_name"`
	ProductNo   string          `json:"product_no"`
	SalesQty    decimal.Decimal `json:"sales_qty"`
	SalesAmount decimal.Decimal `json:"sales_amount"`
}

// SalesRanking 商品销量排行(基于销售出库流水)。按销量降序,返回前 N。
func (s *ReportService) SalesRanking(ctx context.Context, warehouseID uint, startDate, endDate string, limit int) ([]SalesRankingRow, error) {
	db := repository.DBFrom(ctx).Table("psi_stock_movement").
		Select("product_id, SUM(out_qty) AS sales_qty, SUM(out_qty * unit_cost) AS sales_amount").
		Where("biz_type = ?", psimodel.BizSalesOut).
		Group("product_id").
		Order("sales_qty DESC")

	if warehouseID > 0 {
		db = db.Where("warehouse_id = ?", warehouseID)
	}
	if t := parseTime(startDate); t != nil {
		db = db.Where("created_at >= ?", t)
	}
	if t := parseTime(endDate); t != nil {
		db = db.Where("created_at <= ?", t)
	}
	if limit > 0 {
		db = db.Limit(limit)
	}

	var rows []SalesRankingRow
	if err := db.Scan(&rows).Error; err != nil {
		return nil, err
	}
	// 补充商品名(避免匿名 struct map 语法问题,用命名类型)
	if len(rows) > 0 {
		ids := make([]uint, 0, len(rows))
		for _, r := range rows {
			ids = append(ids, r.ProductID)
		}
		type productInfo struct {
			Name      string
			ProductNo string
		}
		var products []struct {
			ID        uint   `gorm:"column:id"`
			Name      string `gorm:"column:name"`
			ProductNo string `gorm:"column:product_no"`
		}
		_ = repository.DBFrom(ctx).Table("crm_product").Where("id IN ?", ids).Find(&products).Error
		pmap := make(map[uint]productInfo, len(products))
		for _, p := range products {
			pmap[p.ID] = productInfo{Name: p.Name, ProductNo: p.ProductNo}
		}
		for i := range rows {
			if p, ok := pmap[rows[i].ProductID]; ok {
				rows[i].ProductName = p.Name
				rows[i].ProductNo = p.ProductNo
			}
		}
	}
	return rows, nil
}

// SummaryRow 采购/销售汇总行(按日)。
type SummaryRow struct {
	Date   string          `json:"date"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// PurchaseSummary 采购汇总(按日聚合,基于已入库的采购单)。
func (s *ReportService) PurchaseSummary(ctx context.Context, startDate, endDate string) ([]SummaryRow, error) {
	return summaryByDate(ctx, "psi_purchase_order", "order_date", "total_amount", startDate, endDate,
		map[string]interface{}{"status": psimodel.PurchaseStatusReceipt})
}

// parseTime 把日期字符串解析为 *time.Time(用于 created_at 范围过滤)。
func parseTime(s string) *time.Time {
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

// summaryByDate 按日期字段聚合某表的金额(内部通用)。
// dateCol/amountCol 为可信的 SQL 列名(非客户端输入)。
func summaryByDate(ctx context.Context, table, dateCol, amountCol, startDate, endDate string, extraWhere map[string]interface{}) ([]SummaryRow, error) {
	db := repository.DBFrom(ctx).Table(table).
		Select("DATE("+dateCol+") AS date, COUNT(*) AS count, COALESCE(SUM("+amountCol+"),0) AS amount").
		Group("DATE(" + dateCol + ")").
		Order("date ASC")
	if t := parseTime(startDate); t != nil {
		db = db.Where(dateCol+" >= ?", t)
	}
	if t := parseTime(endDate); t != nil {
		db = db.Where(dateCol+" <= ?", t)
	}
	for k, v := range extraWhere {
		db = db.Where(k+" = ?", v)
	}
	var rows []SummaryRow
	if err := db.Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
