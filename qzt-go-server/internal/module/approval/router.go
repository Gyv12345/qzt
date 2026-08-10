package approval

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/approval/handler"
)

// Module 审批模块。注册在 /approval 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "approval" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	flowHandler := handler.NewFlowHandler()
	actionHandler := handler.NewActionHandler()
	todoHandler := handler.NewTodoHandler()

	// 已认证路由(仅 JWT):待办/已办/已发起/详情/审批操作
	// 审批操作不走 Casbin(任何登录用户都可审批分配给自己的任务)
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		// 待办
		authenticated.GET("/todos", todoHandler.ListTodo)
		authenticated.GET("/processed", todoHandler.ListProcessed)
		authenticated.GET("/initiated", todoHandler.ListInitiated)
		authenticated.GET("/instances/:id", todoHandler.GetDetail)

		// 审批操作(push/approve/reject 不走 Casbin;revoke 同理)
		authenticated.POST("/actions/push", actionHandler.Push)
		authenticated.POST("/actions/approve", actionHandler.Approve)
		authenticated.POST("/actions/reject", actionHandler.Reject)
		authenticated.PUT("/instances/:id/revoke", actionHandler.Revoke)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):流程设计管理
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/flows", flowHandler.List)
		auth.GET("/flows/by-type", flowHandler.GetByFormType)
		auth.POST("/flows", flowHandler.Create)
		auth.GET("/flows/:id", flowHandler.GetByID)
		auth.PUT("/flows/:id/design", flowHandler.SaveDesign)
		auth.PUT("/flows/:id/enable", flowHandler.Enable)
	}
}
