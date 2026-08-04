package finance

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/finance/handler"
)

// Module 财务管理模块。注册在 /finance 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "finance" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	financeHandler := handler.NewFinanceHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 会计科目
		auth.GET("/accounts", financeHandler.AccountList)
		auth.POST("/accounts", financeHandler.CreateAccount)

		// 记账凭证
		auth.GET("/vouchers", financeHandler.VoucherList)
		auth.POST("/vouchers", financeHandler.CreateVoucher)
		auth.PUT("/vouchers/:id/confirm", financeHandler.ConfirmVoucher)

		// 发票管理
		auth.GET("/invoices", financeHandler.InvoiceList)
		auth.POST("/invoices", financeHandler.CreateInvoice)

		// 财务报表
		auth.GET("/reports/income-statement", financeHandler.IncomeStatement)
		auth.GET("/reports/balance-sheet", financeHandler.BalanceSheet)
	}
}
