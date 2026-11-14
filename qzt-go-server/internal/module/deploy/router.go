package deploy

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/deploy/handler"
)

// Module 静态站发布模块。注册在 /deploy 下。
// 仅 2 条受保护路由(JWT + 操作日志 + Casbin RBAC):触发服务器端静态站
// 重建脚本并轮询状态。超管专用语义:Casbin 超管内存短路放行,未绑菜单/
// 按钮,普通角色无策略天然不可达;脚本路径与参数均为服务端常量。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "deploy" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	deployHandler := handler.NewDeployHandler()

	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.POST("/static", deployHandler.RunStatic)
		auth.GET("/status", deployHandler.Status)
	}
}
