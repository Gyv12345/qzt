// router.go 工作流模块路由(P27)。实现 server.Module 接口,注册在 /workflow 下。
package workflow

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/workflow/handler"
)

// Module 工作流模块。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "workflow" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	defHandler := handler.NewDefinitionHandler()
	runHandler := handler.NewRunHandler()

	// OperationLog 位于 auth 与 RBAC 之间,权限拒绝(403)也被审计
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/definitions", defHandler.List)
		auth.POST("/definitions", defHandler.Create)
		auth.GET("/definitions/:id", defHandler.Get)
		auth.PUT("/definitions/:id", defHandler.Update)
		auth.DELETE("/definitions/:id", defHandler.Delete)
		auth.POST("/definitions/:id/run", defHandler.Run)
		auth.PUT("/definitions/:id/enable", defHandler.Enable)
		auth.GET("/events", runHandler.Events)

		auth.GET("/runs", runHandler.ListRuns)
		auth.GET("/runs/:id", runHandler.GetRun)
		auth.POST("/runs/:id/retry", runHandler.RetryRun)
		auth.DELETE("/runs/:id", runHandler.DeleteRun)
	}
}
