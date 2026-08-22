package psi

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
)

// stock.go 库存结余 + 流水 repository。
// 库存增减的核心逻辑在 service/stock_core.go 的 applyMovement 中编排,
// 本 repo 提供结余读写与流水写入的底层操作(均在调用方事务 ctx 下执行)。
// 结余按 规格SKU+仓库 维度(product_id 冗余自 SKU,便于按商品聚合)。

// StockRepo 库存结余。
type StockRepo struct {
	repository.BaseRepo[psimodel.PsiStock]
}

func NewStockRepo() *StockRepo { return &StockRepo{} }

// ListProductsByIDs 按 ID 集合批量查 crm_product(库存列表/销量排行等展示商品
// 信息用;商品表归 CRM 模块,此跨表只读查询收口在 repository 层,ids 为空返回 nil)。
func ListProductsByIDs(ctx context.Context, ids []uint) ([]crmmodel.CrmProduct, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var products []crmmodel.CrmProduct
	if err := repository.DBFrom(ctx).Where("id IN ?", ids).Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}

// GetBySkuWarehouse 按 规格SKU+仓库 读取结余;不存在返回 gorm.ErrRecordNotFound。
func (r *StockRepo) GetBySkuWarehouse(ctx context.Context, skuID, warehouseID uint) (*psimodel.PsiStock, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"sku_id": skuID, "warehouse_id": warehouseID},
	})
}

// UpsertAdjust 增减库存结余(delta 可正可负),返回调整后的结余。
// 采用「先查再写」:同事务 ctx 下保证一致性(行级由事务隔离保证)。
// 若结余记录不存在则按 delta 新建(适合首次入库)。
func (r *StockRepo) UpsertAdjust(ctx context.Context, productID, skuID, warehouseID uint, delta decimal.Decimal, safetyStock decimal.Decimal) (decimal.Decimal, error) {
	db := repository.DBFrom(ctx)
	var s psimodel.PsiStock
	err := db.Where("sku_id = ? AND warehouse_id = ?", skuID, warehouseID).First(&s).Error
	if err != nil && !isNotFound(err) {
		return decimal.Zero, err
	}
	if isNotFound(err) {
		// 新建结余记录
		s = psimodel.PsiStock{ProductID: productID, SkuID: skuID, WarehouseID: warehouseID, Quantity: delta, SafetyStock: safetyStock}
		if err := db.Create(&s).Error; err != nil {
			return decimal.Zero, err
		}
		return s.Quantity, nil
	}
	// 增减现有结余
	s.Quantity = s.Quantity.Add(delta)
	if err := db.Model(&s).Select("quantity", "safety_stock").Updates(map[string]any{
		"quantity":     s.Quantity,
		"safety_stock": safetyStock,
	}).Error; err != nil {
		return decimal.Zero, err
	}
	return s.Quantity, nil
}

// isNotFound 判断是否为记录不存在错误。
func isNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}
