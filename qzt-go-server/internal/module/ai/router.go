package ai

// router.go AI 助手模块,挂载在 /ai 下。

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/ai/handler"
)

type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "ai"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	h := handler.NewHandler()

	// Agent 调用接口:仅需 JWT 认证(所有登录用户可用 AI 功能)
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.POST("/chat/script", h.GenerateScript)
		authenticated.POST("/chat/follow", h.GenerateFollow)
		authenticated.POST("/chat/report", h.GenerateReport)
	}

	// Agent 管理接口:JWT + 操作日志 + RBAC
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/agents", h.ListAgents)
		auth.POST("/agents", h.CreateAgent)
		auth.PUT("/agents/:id", h.UpdateAgent)
		auth.DELETE("/agents/:id", h.DeleteAgent)
	}
}
