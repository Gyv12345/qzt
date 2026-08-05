package api

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/api/handler"
)

// Module 公共 API 模块，注册在 /api 下。提供健康检查、公共配置、文件上传、仪表盘等接口。
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "api"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	healthHandler := handler.NewHealthHandler()
	configHandler := handler.NewConfigHandler()
	uploadHandler := handler.NewUploadHandler()
	dashboardHandler := handler.NewDashboardHandler()

	// 公开路由(无需鉴权)
	rg.GET("/health", healthHandler.Health)
	rg.GET("/configs/public", configHandler.Public)

	// 已认证路由(仅 JWT):文件上传 + 仪表盘
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.POST("/upload", uploadHandler.Upload)
		authenticated.GET("/upload/sts", uploadHandler.STS)
		authenticated.GET("/dashboard/overview", dashboardHandler.Overview)
		authenticated.GET("/dashboard/sales-trend", dashboardHandler.SalesTrend)
		authenticated.GET("/dashboard/customer-distribution", dashboardHandler.CustomerDistribution)
		authenticated.GET("/dashboard/opportunity-funnel", dashboardHandler.OpportunityFunnel)
		authenticated.GET("/dashboard/finance-summary", dashboardHandler.FinanceSummary)

		// BI 扩展:CRM
		authenticated.GET("/dashboard/contract-trend", dashboardHandler.ContractTrend)
		authenticated.GET("/dashboard/sales-ranking", dashboardHandler.SalesRanking)
		authenticated.GET("/dashboard/lead-source-distribution", dashboardHandler.LeadSourceDistribution)
		// BI 扩展:HRM
		authenticated.GET("/dashboard/employee-distribution", dashboardHandler.EmployeeDistribution)
		authenticated.GET("/dashboard/headcount-trend", dashboardHandler.HeadcountTrend)
		authenticated.GET("/dashboard/attendance-summary", dashboardHandler.AttendanceSummary)
		// BI 扩展:财务
		authenticated.GET("/dashboard/finance-trend", dashboardHandler.FinanceTrend)
		// BI 扩展:进销存
		authenticated.GET("/dashboard/stock-value-by-warehouse", dashboardHandler.StockValueByWarehouse)
		authenticated.GET("/dashboard/sales-vs-purchase", dashboardHandler.SalesVsPurchase)
	}
}
