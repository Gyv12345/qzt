package psi

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/psi/handler"
)

// Module PSI 进销存模块。实现 server.Module 接口,注册在 /psi 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "psi" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	warehouseHandler := handler.NewWarehouseHandler()
	supplierHandler := handler.NewSupplierHandler()
	stockHandler := handler.NewStockHandler()
	purchaseHandler := handler.NewPurchaseHandler()
	salesHandler := handler.NewSalesHandler()
	stockIOHandler := handler.NewStockIOHandler()
	reportHandler := handler.NewReportHandler()
	assetHandler := handler.NewAssetHandler()
	stocktakeHandler := handler.NewStocktakeHandler()
	assetStocktakeHandler := handler.NewAssetStocktakeHandler()
	transferHandler := handler.NewTransferHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):CRUD 与写操作。
	// OperationLog 位于 auth 与 RBAC 之间,使权限拒绝(403)也被审计。
	// R65 授权面收窄(2026-11-16):原 login-only 组的库存结余/收发明细/报表查询四端点并入本组——
	// 此前任意登录用户可读全部库存流水与经营报表,现按角色授权(purchaser/sales_director/super_admin)。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 库存结余与收发明细(查询;静态路径先于下方 :id 系路由注册)
		auth.GET("/stock", stockHandler.List)
		auth.GET("/stock/movements", stockHandler.Movements)

		// 报表(只读)
		auth.GET("/reports/sales-ranking", reportHandler.SalesRanking)
		auth.GET("/reports/purchase-summary", reportHandler.PurchaseSummary)

		// 仓库管理
		auth.GET("/warehouses", warehouseHandler.List)
		auth.POST("/warehouses", warehouseHandler.Create)
		auth.GET("/warehouses/enabled", warehouseHandler.ListEnabled)
		auth.GET("/warehouses/:id", warehouseHandler.GetByID)
		auth.PUT("/warehouses/:id", warehouseHandler.Update)
		auth.DELETE("/warehouses/:id", warehouseHandler.Delete)

		// 供应商管理
		auth.GET("/suppliers", supplierHandler.List)
		auth.POST("/suppliers", supplierHandler.Create)
		auth.GET("/suppliers/enabled", supplierHandler.ListEnabled)
		auth.GET("/suppliers/:id", supplierHandler.GetByID)
		auth.PUT("/suppliers/:id", supplierHandler.Update)
		auth.DELETE("/suppliers/:id", supplierHandler.Delete)

		// 采购管理
		auth.GET("/purchase-orders", purchaseHandler.List)
		auth.POST("/purchase-orders", purchaseHandler.Create)
		auth.GET("/purchase-orders/:id", purchaseHandler.GetByID)
		auth.PUT("/purchase-orders/:id", purchaseHandler.Update)
		auth.DELETE("/purchase-orders/:id", purchaseHandler.Delete)
		auth.POST("/purchase-orders/:id/stock-in", purchaseHandler.StockIn)

		// 采购退货
		auth.GET("/purchase-returns", purchaseHandler.ListReturns)
		auth.POST("/purchase-returns", purchaseHandler.CreateReturn)
		auth.GET("/purchase-returns/:id", purchaseHandler.GetReturnByID)
		auth.POST("/purchase-returns/:id/stock-out", purchaseHandler.StockOutReturn)

		// 销售管理
		auth.GET("/sales-orders", salesHandler.List)
		auth.POST("/sales-orders", salesHandler.Create)
		auth.GET("/sales-orders/:id", salesHandler.GetByID)
		auth.PUT("/sales-orders/:id", salesHandler.Update)
		auth.DELETE("/sales-orders/:id", salesHandler.Delete)
		auth.POST("/sales-orders/:id/stock-out", salesHandler.StockOut)

		// 销售退货
		auth.GET("/sales-returns", salesHandler.ListReturns)
		auth.POST("/sales-returns", salesHandler.CreateReturn)
		auth.GET("/sales-returns/:id", salesHandler.GetReturnByID)
		auth.POST("/sales-returns/:id/stock-in", salesHandler.StockInReturn)

		// 其他入库(盘点盈亏/赠品/期初等,创建即生效)
		auth.GET("/stock-in-orders", stockIOHandler.ListIn)
		auth.POST("/stock-in-orders", stockIOHandler.CreateIn)
		auth.GET("/stock-in-orders/:id", stockIOHandler.GetInByID)

		// 其他出库(盘亏/损耗/领用等,创建即生效)
		auth.GET("/stock-out-orders", stockIOHandler.ListOut)
		auth.POST("/stock-out-orders", stockIOHandler.CreateOut)
		auth.GET("/stock-out-orders/:id", stockIOHandler.GetOutByID)

		// 库存盘点(创建冻结快照→录实盘→确认派生盘盈亏)
		auth.GET("/stocktake-orders", stocktakeHandler.List)
		auth.POST("/stocktake-orders", stocktakeHandler.Create)
		auth.GET("/stocktake-orders/:id", stocktakeHandler.GetByID)
		auth.PUT("/stocktake-orders/:id", stocktakeHandler.UpdateActual)
		auth.POST("/stocktake-orders/:id/confirm", stocktakeHandler.Confirm)
		auth.PUT("/stocktake-orders/:id/cancel", stocktakeHandler.Cancel)
		auth.DELETE("/stocktake-orders/:id", stocktakeHandler.Delete)

		// 库存调拨(创建在途→执行出+入同事务)
		auth.GET("/stock-transfer-orders", transferHandler.ListTransfer)
		auth.POST("/stock-transfer-orders", transferHandler.CreateTransfer)
		auth.GET("/stock-transfer-orders/:id", transferHandler.GetTransferByID)
		auth.POST("/stock-transfer-orders/:id/execute", transferHandler.ExecuteTransfer)
		auth.PUT("/stock-transfer-orders/:id/cancel", transferHandler.CancelTransfer)
		auth.DELETE("/stock-transfer-orders/:id", transferHandler.DeleteTransfer)

		// 资产盘点(静态路径须先于下方 /assets/:id 注册,避免与参数路由冲突)
		auth.GET("/assets/stocktakes", assetStocktakeHandler.List)
		auth.POST("/assets/stocktakes", assetStocktakeHandler.Create)
		auth.GET("/assets/stocktakes/:id", assetStocktakeHandler.GetByID)
		auth.PUT("/assets/stocktakes/:id/items/:itemId", assetStocktakeHandler.SubmitItem)
		auth.POST("/assets/stocktakes/:id/finish", assetStocktakeHandler.Finish)

		// 资产折旧计提(手动触发;定时任务 bean_class=asset.depreciate.monthly 由 sys_job 种子配)
		auth.POST("/assets/depreciate/run", assetHandler.DepreciateRun)
		auth.GET("/assets/:id/depreciation-logs", assetHandler.DepreciationLogs)

		// 固定资产
		auth.GET("/assets", assetHandler.List)
		auth.POST("/assets", assetHandler.Create)
		auth.GET("/assets/:id", assetHandler.GetByID)
		auth.PUT("/assets/:id", assetHandler.Update)
		auth.DELETE("/assets/:id", assetHandler.Delete)
	}
}
