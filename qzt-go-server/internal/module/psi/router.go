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

	// 已认证路由(仅 JWT,无 RBAC):库存结余、收发明细、报表等查询类。
	// 静态路径须先于 :id 注册,避免与参数路由冲突。
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		// 库存结余与收发明细(查询)
		authenticated.GET("/stock", stockHandler.List)
		authenticated.GET("/stock/movements", stockHandler.Movements)

		// 报表(只读)
		authenticated.GET("/reports/sales-ranking", reportHandler.SalesRanking)
		authenticated.GET("/reports/purchase-summary", reportHandler.PurchaseSummary)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):CRUD 与写操作。
	// OperationLog 位于 auth 与 RBAC 之间,使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
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

		// 固定资产
		auth.GET("/assets", assetHandler.List)
		auth.POST("/assets", assetHandler.Create)
		auth.GET("/assets/:id", assetHandler.GetByID)
		auth.PUT("/assets/:id", assetHandler.Update)
		auth.DELETE("/assets/:id", assetHandler.Delete)
	}
}
