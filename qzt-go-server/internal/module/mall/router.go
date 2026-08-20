package mall

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/mall/handler"
)

// Module 商城模块。注册在 /mall 下。
// 公开路由(免登录):/mall/public/* 供独立商城站(mall 前端)调用;
// 管理路由走 JWT + 操作日志 + Casbin RBAC。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "mall" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	orderHandler := handler.NewOrderHandler()

	// 公开路由(免登录,商城站专用)
	public := rg.Group("/public")
	{
		public.GET("/goods", orderHandler.PublicGoods)
		public.POST("/orders", orderHandler.PublicCreateOrder)
		public.GET("/orders/:orderNo", orderHandler.PublicGetOrder)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/orders", orderHandler.List)
		auth.GET("/orders/:id", orderHandler.GetByID)
		auth.PUT("/orders/:id/status", orderHandler.UpdateStatus)
		auth.POST("/orders/:id/generate-sales-order", orderHandler.GenerateSalesOrder)
	}
}
