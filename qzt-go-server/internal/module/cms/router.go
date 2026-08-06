package cms

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/cms/handler"
)

// Module CMS 内容管理模块。实现 server.Module 接口，注册在 /cms 下。
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "cms"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	categoryHandler := handler.NewCategoryHandler()
	tagHandler := handler.NewTagHandler()
	articleHandler := handler.NewArticleHandler()
	pageHandler := handler.NewPageHandler()

	// 公开路由（无需鉴权）：前台站点/小程序消费的只读接口。
	// 注意 slug 路由须注册在 :id 之前，避免 /articles/slug/xxx 与 /articles/:id 冲突。
	public := rg.Group("/public")
	{
		public.GET("/articles", articleHandler.ListPublished)
		public.GET("/articles/slug/:slug", articleHandler.PublicGetBySlug)
		public.GET("/articles/:id", articleHandler.PublicGetByID)
		public.GET("/categories", categoryHandler.PublicTree)
		public.GET("/tags", tagHandler.PublicList)
		public.GET("/pages/:slug", pageHandler.PublicGetBySlug)
		public.GET("/pages", pageHandler.PublicList)
	}

	// 已认证路由（仅 JWT，无 RBAC）：下拉与树查询。
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.GET("/categories/all", categoryHandler.ListAll)
		authenticated.GET("/tags/all", tagHandler.ListAll)
	}

	// 受保护路由（JWT + 操作日志 + Casbin RBAC）：CRUD 管理操作。
	// OperationLog 位于 auth 与 RBAC 之间，使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 分类管理
		auth.GET("/categories", categoryHandler.List)
		auth.POST("/categories", categoryHandler.Create)
		auth.GET("/categories/:id", categoryHandler.GetByID)
		auth.PUT("/categories/:id", categoryHandler.Update)
		auth.DELETE("/categories/:id", categoryHandler.Delete)

		// 标签管理
		auth.GET("/tags", tagHandler.List)
		auth.POST("/tags", tagHandler.Create)
		auth.GET("/tags/:id", tagHandler.GetByID)
		auth.PUT("/tags/:id", tagHandler.Update)
		auth.DELETE("/tags/:id", tagHandler.Delete)

		// 文章管理
		auth.GET("/articles", articleHandler.List)
		auth.POST("/articles", articleHandler.Create)
		auth.GET("/articles/:id", articleHandler.GetByID)
		auth.PUT("/articles/:id", articleHandler.Update)
		auth.DELETE("/articles/:id", articleHandler.Delete)

		// 单页管理
		auth.GET("/pages", pageHandler.List)
		auth.POST("/pages", pageHandler.Create)
		auth.GET("/pages/:id", pageHandler.GetByID)
		auth.PUT("/pages/:id", pageHandler.Update)
		auth.DELETE("/pages/:id", pageHandler.Delete)
	}
}
