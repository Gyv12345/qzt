package marketing

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/marketing/handler"
)

// Module 营销模块。实现 server.Module 接口,注册在 /marketing 下。
// 当前能力:巨量引擎(抖音)渠道账号管理 + OAuth 授权 + 飞鱼线索自动入库。
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "marketing"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	accountHandler := handler.NewAccountHandler()
	logHandler := handler.NewLogHandler()

	// 公开路由(免鉴权):巨量 OAuth 授权完成后重定向回来,state 在 Redis 中校验。
	rg.GET("/oauth/callback", accountHandler.OAuthCallback)

	// OperationLog 位于 auth 与 RBAC 之间,使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/accounts", accountHandler.List)
		auth.POST("/accounts", accountHandler.Create)
		auth.PUT("/accounts/:id", accountHandler.Update)
		auth.DELETE("/accounts/:id", accountHandler.Delete)
		auth.GET("/accounts/:id/authorize-url", accountHandler.AuthorizeURL)
		auth.POST("/accounts/:id/sync", accountHandler.Sync)

		auth.GET("/logs", logHandler.List)
		auth.GET("/logs/:id", logHandler.GetByID)
	}
}
