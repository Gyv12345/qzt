package oa

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/oa/handler"
)

// Module OA 办公自动化模块。注册在 /oa 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "oa" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	expenseHandler := handler.NewExpenseHandler()
	tripHandler := handler.NewTripHandler()
	loanHandler := handler.NewLoanHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 报销单
		auth.GET("/expenses", expenseHandler.List)
		auth.POST("/expenses", expenseHandler.Create)
		auth.GET("/expenses/:id", expenseHandler.GetByID)
		auth.PUT("/expenses/:id", expenseHandler.Update)
		auth.DELETE("/expenses/:id", expenseHandler.Delete)
		auth.POST("/expenses/:id/mark-paid", expenseHandler.MarkPaid)

		// 出差申请
		auth.GET("/trips", tripHandler.List)
		auth.POST("/trips", tripHandler.Create)
		auth.GET("/trips/:id", tripHandler.GetByID)
		auth.PUT("/trips/:id", tripHandler.Update)
		auth.DELETE("/trips/:id", tripHandler.Delete)

		// 借款/备用金
		auth.GET("/loans", loanHandler.List)
		auth.POST("/loans", loanHandler.Create)
		auth.GET("/loans/:id", loanHandler.GetByID)
		auth.PUT("/loans/:id", loanHandler.Update)
		auth.DELETE("/loans/:id", loanHandler.Delete)
		auth.POST("/loans/:id/mark-repaid", loanHandler.MarkRepaid)
	}
}
