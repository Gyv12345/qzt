package storefront

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/storefront/handler"
)

// Module 跨境独立站模块。注册在 /storefront 下。
// 公开路由(免登录):/storefront/public/* 供独立站前台(海外买家)调用
// (P28-B 起含 checkout 下单与 Stripe webhook;P28-C 起 PayPal 下单/支付确认);
// 管理路由走 JWT + 操作日志 + Casbin RBAC(P28-A 商品上架位 + 站点配置;
// P28-B 订单管理;询盘暂无管理接口)。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "storefront" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	productHandler := handler.NewProductHandler()
	inquiryHandler := handler.NewInquiryHandler()
	configHandler := handler.NewConfigHandler()
	checkoutHandler := handler.NewCheckoutHandler()
	paypalHandler := handler.NewPayPalHandler()
	orderHandler := handler.NewOrderAdminHandler()

	// 公开路由(免登录,独立站前台专用)
	public := rg.Group("/public")
	{
		public.GET("/products", productHandler.PublicProducts)
		public.GET("/products/:slug", productHandler.PublicProductDetail)
		public.GET("/config", configHandler.PublicConfig)
		public.POST("/inquiries", inquiryHandler.PublicCreateInquiry)
		public.POST("/checkout", checkoutHandler.PublicCheckout)
		public.POST("/webhooks/stripe", checkoutHandler.StripeWebhook)
		public.POST("/paypal/create", paypalHandler.PublicCreatePayPal)
		public.POST("/paypal/capture", paypalHandler.PublicCapturePayPal)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/products", productHandler.AdminList)
		auth.POST("/products", productHandler.AdminUpsert)
		auth.GET("/products/:id", productHandler.AdminGet)
		auth.PUT("/products/:id", productHandler.AdminUpsert)
		auth.GET("/config", configHandler.AdminGet)
		auth.PUT("/config", configHandler.AdminPut)
		auth.GET("/orders", orderHandler.AdminList)
		auth.GET("/orders/:id", orderHandler.AdminGet)
	}
}
