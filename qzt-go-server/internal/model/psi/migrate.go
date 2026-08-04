package psi

import (
	"gorm.io/gorm"
)

// migrate.go PSI 进销存模块建表 + 种子数据。

// allModels 所有需要建表的 PSI model。新增 model 时在此登记。
func allModels() []any {
	return []any{
		// 基础数据:仓库/供应商/库存结余/流水
		&PsiWarehouse{},
		&PsiSupplier{},
		&PsiStock{},
		&PsiStockMovement{},
		// 采购
		&PsiPurchaseOrder{},
		&PsiPurchaseOrderDetail{},
		&PsiPurchaseReturn{},
		&PsiPurchaseReturnDetail{},
		// 销售
		&PsiSalesOrder{},
		&PsiSalesOrderDetail{},
		&PsiSalesReturn{},
		&PsiSalesReturnDetail{},
		// 其他出入库(盘点/赠品/损耗等)
		&PsiStockInOrder{},
		&PsiStockInOrderDetail{},
		&PsiStockOutOrder{},
		&PsiStockOutOrderDetail{},
	}
}

// AutoMigrate 同步 PSI 所有表结构。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}

// SeedPSIData 写入 PSI 初始数据:默认仓库 + API/菜单权限。
// 幂等:按默认仓库编码(PSI_DEFAULT_WH)是否存在判断。
// API/菜单的补全见 SeedPSIPermissions(每次启动按 (path,method) 去重补充,对已部署库友好)。
func SeedPSIData(db *gorm.DB) error {
	// 默认仓库(幂等)
	var count int64
	db.Model(&PsiWarehouse{}).Where("code = ?", "PSI_DEFAULT_WH").Count(&count)
	if count == 0 {
		wh := &PsiWarehouse{
			Code: "PSI_DEFAULT_WH", Name: "默认仓库", Sort: 1,
			Status: 1, IsDefault: 1, Remark: "系统初始化默认仓库",
		}
		if err := db.Create(wh).Error; err != nil {
			return err
		}
	}
	return nil
}
