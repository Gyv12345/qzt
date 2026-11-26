package mall

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	buyerauth "qzt-go-server/internal/module/mall/buyerauth"
	"qzt-go-server/internal/module/mall/handler"
)

// Module 商城模块。注册在 /mall 下。路由分三层,注释如下:
//
//	第一层 公开(public,免登录):/mall/public/* 供独立商城站(mall 前端)调用;
//	  其中 POST /public/orders 挂 MallBuyerOptional(有买家 token 则识别身份供用券,
//	  无则匿名下单)。
//	第二层 买家(auth,买家 token):/mall/auth/* 走 buyerauth.MallBuyerAuth,
//	  只认 mall 买家 token(派生密钥,与员工 JWT 双向不可互认),买家领券/查券包。
//	第三层 管理(JWT + 操作日志 + Casbin RBAC):/mall/orders/* 员工后台订单管理;
//	  /mall/admin/coupons 与 /mall/admin/promotions 优惠券/限时特价管理
//	  (独立 /admin 前缀,避免与公开/买家路径撞车)。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "mall" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	orderHandler := handler.NewOrderHandler()
	authHandler := handler.NewAuthHandler()
	couponHandler := handler.NewCouponHandler()
	promoHandler := handler.NewPromotionHandler()

	// ── 第一层:公开路由(免登录,商城站专用) ──
	public := rg.Group("/public")
	{
		public.GET("/goods", orderHandler.PublicGoods)
		public.POST("/orders", buyerauth.MallBuyerOptional(), orderHandler.PublicCreateOrder)
		public.GET("/orders/:orderNo", orderHandler.PublicGetOrder)
		// 买家账号:注册/登录(免登录)
		public.POST("/auth/register", authHandler.Register)
		public.POST("/auth/login", authHandler.Login)
		// 可领优惠券列表(免登录)
		public.GET("/coupons", couponHandler.PublicList)
	}

	// ── 第二层:买家路由(mall 买家 token,与员工 JWT 完全隔离) ──
	buyer := rg.Group("/auth", buyerauth.MallBuyerAuth())
	{
		buyer.GET("/me", authHandler.Me)
		buyer.GET("/coupons", couponHandler.MyCoupons)
		buyer.POST("/coupons/:id/claim", couponHandler.Claim)
	}

	// ── 第三层:管理路由(员工 JWT + 操作日志 + Casbin RBAC) ──
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/orders", orderHandler.List)
		auth.GET("/orders/:id", orderHandler.GetByID)
		auth.PUT("/orders/:id/status", orderHandler.UpdateStatus)
		auth.POST("/orders/:id/generate-sales-order", orderHandler.GenerateSalesOrder)
		// 优惠券管理
		auth.GET("/admin/coupons", couponHandler.AdminList)
		auth.POST("/admin/coupons", couponHandler.AdminCreate)
		auth.PUT("/admin/coupons/:id", couponHandler.AdminUpdate)
		auth.DELETE("/admin/coupons/:id", couponHandler.AdminDelete)
		// 限时特价管理
		auth.GET("/admin/promotions", promoHandler.AdminList)
		auth.POST("/admin/promotions", promoHandler.AdminCreate)
		auth.PUT("/admin/promotions/:id", promoHandler.AdminUpdate)
		auth.DELETE("/admin/promotions/:id", promoHandler.AdminDelete)
	}
}
