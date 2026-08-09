package enterprise

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/enterprise/handler"
)

// Module enterprise 模块(通知中心 + 定时任务)。注册在 /enterprise 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "enterprise" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	jobHandler := handler.NewJobHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):定时任务管理
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 定时任务
		auth.GET("/jobs", jobHandler.List)
		auth.POST("/jobs", jobHandler.Create)
		auth.GET("/jobs/:id", jobHandler.GetByID)
		auth.PUT("/jobs/:id", jobHandler.Update)
		auth.DELETE("/jobs/:id", jobHandler.Delete)
		auth.POST("/jobs/:id/run", jobHandler.RunOnce)
		auth.GET("/job-logs", jobHandler.ListLogs)
	}
}
