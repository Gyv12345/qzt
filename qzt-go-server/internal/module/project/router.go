package project

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/project/handler"
)

// Module 项目管理模块。注册在 /project 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "project" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	h := handler.NewProjectHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 项目
		auth.GET("/projects", h.List)
		auth.POST("/projects", h.Create)
		auth.GET("/projects/:id", h.GetByID)
		auth.PUT("/projects/:id", h.Update)
		auth.DELETE("/projects/:id", h.Delete)

		// 任务
		auth.GET("/tasks", h.ListTasks)
		auth.POST("/tasks", h.CreateTask)
		auth.PUT("/tasks/:id", h.UpdateTask)
		auth.PUT("/tasks/:id/status", h.UpdateTaskStatus)
		auth.DELETE("/tasks/:id", h.DeleteTask)
	}
}
