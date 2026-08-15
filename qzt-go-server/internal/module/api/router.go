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
	attachmentHandler := handler.NewAttachmentHandler()
	dashboardHandler := handler.NewDashboardHandler()
	calendarHandler := handler.NewCalendarHandler()

	// 公开路由(无需鉴权)
	rg.GET("/health", healthHandler.Health)
	rg.GET("/configs/public", configHandler.Public)

	// 已认证路由(仅 JWT):文件上传 + 签名下载 + 附件 + 个人口径仪表盘
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.POST("/upload", uploadHandler.Upload)
		authenticated.GET("/upload/sts", uploadHandler.STS)
		// 私有文件下载:sign 需登录签发 URL;dl 靠 token 鉴权(无需 Authorization header,以便 <img src> 直接用)
		authenticated.GET("/file/sign", uploadHandler.Sign)
		rg.GET("/file/dl", uploadHandler.Download)

		// 通用附件元数据(列表/创建/删除)。附件作为多态公共能力,挂 api 模块。
		authenticated.GET("/attachments", attachmentHandler.List)
		authenticated.POST("/attachments", attachmentHandler.Create)
		authenticated.DELETE("/attachments/:id", attachmentHandler.Delete)

		// 个人/数据权限口径仪表盘:overview 与 customer-distribution、
		// opportunity-funnel 在 service 层叠加了 datascope,仅登录即可。
		authenticated.GET("/dashboard/overview", dashboardHandler.Overview)
		authenticated.GET("/dashboard/customer-distribution", dashboardHandler.CustomerDistribution)
		authenticated.GET("/dashboard/opportunity-funnel", dashboardHandler.OpportunityFunnel)

		// 统一日历:聚合各业务模块带日期的待办(仅当前用户)
		authenticated.GET("/calendar", calendarHandler.Calendar)
	}

	// 受保护路由(JWT + 操作日志 + Casbin):全公司经营口径的 BI 看板。
	// 这些接口不做数据权限过滤(全员业绩/财务总额等),仅登录即可看属于
	// 越权暴露,挪入 RBAC 组按角色授权(种子见 docs/sql/dashboard_rbac.sql)。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// BI:CRM(销售趋势/业绩排行/合同趋势/线索来源)
		auth.GET("/dashboard/sales-trend", dashboardHandler.SalesTrend)
		auth.GET("/dashboard/contract-trend", dashboardHandler.ContractTrend)
		auth.GET("/dashboard/sales-ranking", dashboardHandler.SalesRanking)
		auth.GET("/dashboard/lead-source-distribution", dashboardHandler.LeadSourceDistribution)
		// BI:HRM(人员分布/人数趋势/考勤汇总)
		auth.GET("/dashboard/employee-distribution", dashboardHandler.EmployeeDistribution)
		auth.GET("/dashboard/headcount-trend", dashboardHandler.HeadcountTrend)
		auth.GET("/dashboard/attendance-summary", dashboardHandler.AttendanceSummary)
		// BI:财务(财务汇总/收支趋势)
		auth.GET("/dashboard/finance-summary", dashboardHandler.FinanceSummary)
		auth.GET("/dashboard/finance-trend", dashboardHandler.FinanceTrend)
		// BI:进销存(库存货值/购销对比)
		auth.GET("/dashboard/stock-value-by-warehouse", dashboardHandler.StockValueByWarehouse)
		auth.GET("/dashboard/sales-vs-purchase", dashboardHandler.SalesVsPurchase)
	}
}
