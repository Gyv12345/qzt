package kb

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/kb/handler"
)

// Module 知识库模块。注册在 /kb 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "kb" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	catHandler := handler.NewCategoryHandler()
	docHandler := handler.NewDocumentHandler()
	verHandler := handler.NewVersionHandler()
	collabHandler := handler.NewCollabHandler()

	// WebSocket 协同编辑(单独 JWT 校验,不走中间件链)
	rg.GET("/documents/:id/collab", collabHandler.HandleCollab)

	// 已认证路由(仅 JWT,无 RBAC):分类列表
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.GET("/categories", catHandler.List)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 分类管理
		auth.POST("/categories", catHandler.Create)
		auth.PUT("/categories/:id", catHandler.Update)
		auth.DELETE("/categories/:id", catHandler.Delete)

		// 文档管理
		auth.GET("/documents", docHandler.List)
		auth.POST("/documents", docHandler.Create)
		auth.GET("/documents/:id", docHandler.GetByID)
		auth.PUT("/documents/:id", docHandler.Update)
		auth.DELETE("/documents/:id", docHandler.Delete)

		// 版本历史
		auth.GET("/documents/:id/versions", verHandler.List)
		auth.PUT("/documents/:id/versions/:versionId/restore", verHandler.Restore)
	}
}
