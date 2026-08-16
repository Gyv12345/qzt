package service

import (
	"context"

	"github.com/shopspring/decimal"

	psirepo "qzt-go-server/internal/repository/psi"
)

// report.go 进销存报表服务:采购汇总、商品销量排行。
// 报表均为只读查询,聚合 SQL 收口在 repository/psi
// (StockMovementRepo.SalesRank / PurchaseOrderRepo.SummaryByDate),
// service 只做参数透传与结果组装;商品信息批量查询走 psirepo.ListProductsByIDs。

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
	aggs, err := s.movementRepo.SalesRank(ctx, warehouseID, startDate, endDate, limit)
	if err != nil {
		return nil, err
	}
	var rows []SalesRankingRow
	for _, a := range aggs {
		rows = append(rows, SalesRankingRow{ProductID: a.ProductID, SalesQty: a.SalesQty, SalesAmount: a.SalesAmount})
	}
	// 补充商品名/编号(查询出错沿袭原语义:忽略,名称留空)
	if len(rows) > 0 {
		ids := make([]uint, 0, len(rows))
		for _, r := range rows {
			ids = append(ids, r.ProductID)
		}
		type productInfo struct {
			Name      string
			ProductNo string
		}
		products, _ := psirepo.ListProductsByIDs(ctx, ids)
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
type SummaryRow = psirepo.SummaryRow

// PurchaseSummary 采购汇总(按日聚合,基于已入库的采购单)。
func (s *ReportService) PurchaseSummary(ctx context.Context, startDate, endDate string) ([]SummaryRow, error) {
	return s.purchaseRepo.SummaryByDate(ctx, startDate, endDate)
}
