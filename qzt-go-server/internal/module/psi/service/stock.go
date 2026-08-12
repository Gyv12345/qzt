package service

import (
	"context"
	"errors"
	"strings"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// stock.go 库存查询:结余列表(含商品信息)、收发明细、低库存预警。
// 商品信息直接查 crm_product(只读),不引入 PSI→CRM repository 依赖。

// StockList 库存结余分页列表。join crm_product 取商品名/编号/单位/分类。
// lowStock=true 时仅返回 quantity < safety_stock(且 safety_stock>0)的预警行。
func (s *StockService) StockList(ctx context.Context, page, pageSize int, warehouseID uint, keyword string, lowStock bool) ([]StockListRow, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]interface{}{}
	if warehouseID > 0 {
		where["warehouse_id"] = warehouseID
	}
	if len(where) > 0 {
		q.Where = where
	}
	// 低库存预警在 SQL 层过滤(避免 total 与 list 不一致:safety_stock>0 且 quantity<safety_stock)
	if lowStock {
		q.Conds = append(q.Conds, repository.Cond{Query: "safety_stock > 0 AND quantity < safety_stock"})
	}
	stocks, total, err := s.stockRepo.PageList(ctx, page, pageSize, q)
	if err != nil {
		return nil, 0, err
	}
	if len(stocks) == 0 {
		return []StockListRow{}, total, nil
	}

	// 批量取商品信息
	productIDs := make([]uint, 0, len(stocks))
	for _, st := range stocks {
		productIDs = append(productIDs, st.ProductID)
	}
	products, err := s.fetchProducts(ctx, productIDs)
	if err != nil {
		return nil, 0, err
	}
	pMap := make(map[uint]crmmodel.CrmProduct, len(products))
	for _, p := range products {
		pMap[p.ID] = p
	}

	rows := make([]StockListRow, 0, len(stocks))
	for _, st := range stocks {
		p := pMap[st.ProductID] // 不存在则为零值
		row := StockListRow{PsiStock: st, ProductName: p.Name, ProductNo: p.ProductNo, Unit: p.Unit, Category: p.Category}
		// 低库存过滤已下沉到 SQL(见上方 q.Conds),此处不再内存过滤
		// 关键词过滤(商品名/编号)
		if keyword != "" && !strings.Contains(p.Name, keyword) && !strings.Contains(p.ProductNo, keyword) {
			continue
		}
		rows = append(rows, row)
	}
	return rows, total, nil
}

// MovementDetail 收发明细查询。按仓库/商品/业务类型过滤,分页,按 id 倒序。
func (s *StockService) MovementDetail(ctx context.Context, page, pageSize int, warehouseID, productID uint, bizType string) ([]psimodel.PsiStockMovement, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]interface{}{}
	if warehouseID > 0 {
		where["warehouse_id"] = warehouseID
	}
	if productID > 0 {
		where["product_id"] = productID
	}
	if bizType != "" {
		where["biz_type"] = bizType
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.movementRepo.PageList(ctx, page, pageSize, q)
}

// GetBalance 查询某商品在某仓库的结余(不存在返回 0)。
func (s *StockService) GetBalance(ctx context.Context, productID, warehouseID uint) (decimal.Decimal, error) {
	st, err := s.stockRepo.GetByProductWarehouse(ctx, productID, warehouseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return decimal.Zero, nil
		}
		return decimal.Zero, err
	}
	return st.Quantity, nil
}

// fetchProducts 按 ID 批量查 crm_product(只读)。
func (s *StockService) fetchProducts(ctx context.Context, ids []uint) ([]crmmodel.CrmProduct, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var products []crmmodel.CrmProduct
	if err := repository.DBFrom(ctx).Where("id IN ?", ids).Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}
