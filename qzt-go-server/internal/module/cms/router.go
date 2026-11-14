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
	trackHandler := handler.NewTrackHandler()
	pushHandler := handler.NewPushHandler()
	versionHandler := handler.NewVersionHandler()

	// 公开路由（无需鉴权）：前台站点/小程序消费的只读接口。
	// 注意 slug 路由须注册在 :id 之前，避免 /articles/slug/xxx 与 /articles/:id 冲突。
	public := rg.Group("/public")
	{
		public.GET("/articles", articleHandler.ListPublished)
		public.GET("/articles/slug/:slug", articleHandler.PublicGetBySlug)
		public.GET("/articles/:id", articleHandler.PublicGetByID)
		// 站内搜索(P21):ngram 全文检索公开可见文章
		public.GET("/search", articleHandler.SearchPublished)
		public.GET("/categories", categoryHandler.PublicTree)
		public.GET("/tags", tagHandler.PublicList)
		public.GET("/pages/:slug", pageHandler.PublicGetBySlug)
		public.GET("/pages", pageHandler.PublicList)
		// 官网埋点批量上报(只写,IP/UA 服务端提取)
		public.POST("/track", trackHandler.Ingest)
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

		// 文章版本快照与回滚(P20)
		auth.GET("/articles/:id/versions", versionHandler.List)
		auth.POST("/articles/:id/versions/:version_id/rollback", versionHandler.Rollback)

		// 媒体库(P22)

		// 单页管理
		auth.GET("/pages", pageHandler.List)
		auth.POST("/pages", pageHandler.Create)
		auth.GET("/pages/:id", pageHandler.GetByID)
		auth.PUT("/pages/:id", pageHandler.Update)
		auth.DELETE("/pages/:id", pageHandler.Delete)

		// 访问统计
		auth.GET("/track/summary", trackHandler.Summary)
		auth.GET("/track/list", trackHandler.List)

		// 搜索引擎推送(百度主动推送/IndexNow)
		auth.POST("/push/baidu", pushHandler.PushBaidu)
		auth.POST("/push/indexnow", pushHandler.PushIndexNow)
		auth.GET("/push/logs", pushHandler.ListPushLogs)
	}
}
