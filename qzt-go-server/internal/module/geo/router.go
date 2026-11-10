package geo

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/geo/handler"
)

// Module GEO 监测模块。实现 server.Module 接口,注册在 /geo 下。
// 能力:GEO 手册第六节「20 问 × N 平台打分表」的系统化——提示词库/平台管理、
// 手动与定时触发的监测轮次(P2 LLM 网关多实例)、指标趋势与明细导出。
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "geo"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	h := handler.NewGeoHandler()

	// OperationLog 位于 auth 与 RBAC 之间,使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 提示词库
		auth.GET("/prompts", h.ListPrompts)
		auth.POST("/prompts", h.CreatePrompt)
		auth.PUT("/prompts/:id", h.UpdatePrompt)
		auth.DELETE("/prompts/:id", h.DeletePrompt)

		// 监测平台
		auth.GET("/platforms", h.ListPlatforms)
		auth.POST("/platforms", h.CreatePlatform)
		auth.PUT("/platforms/:id", h.UpdatePlatform)
		auth.DELETE("/platforms/:id", h.DeletePlatform)

		// 监测轮次
		auth.POST("/runs", h.StartRun)
		auth.GET("/runs", h.ListRuns)
		auth.GET("/runs/:id", h.GetRun)
		auth.GET("/runs/:id/results", h.ListResults)
		auth.GET("/runs/:id/export", h.ExportRun)

		// 趋势
		auth.GET("/trend", h.Trend)

		// ── 信源产线 ──

		// 选题池
		auth.GET("/topics", h.ListTopics)
		auth.POST("/topics", h.CreateTopic)
		auth.PUT("/topics/:id", h.UpdateTopic)
		auth.DELETE("/topics/:id", h.DeleteTopic)
		auth.POST("/topics/:id/review", h.ReviewTopic)
		auth.POST("/topics/generate", h.GenerateTopics)

		// 稿件库（:id 路由放在 /sources/generate、/sources/run 精确路径之后）
		auth.GET("/sources", h.ListSources)
		auth.POST("/sources", h.CreateSource)
		auth.PUT("/sources/:id", h.UpdateSource)
		auth.DELETE("/sources/:id", h.DeleteSource)
		auth.POST("/sources/:id/push", h.PushSource)
		auth.POST("/sources/:id/publish", h.PublishSource)
		auth.GET("/sources/:id/publish", h.RefreshPublish)
		auth.POST("/sources/:id/douyin", h.PushSourceDouyin)
		auth.POST("/sources/:id/variants", h.GenerateVariant)
		auth.POST("/sources/:id/qc", h.QCSource)
		auth.POST("/sources/generate", h.GenerateSource)
		auth.POST("/sources/run", h.RunPipeline)

		// 抖音授权账号
		auth.GET("/platforms/douyin/authorize", h.DouyinAuthorizeURL)
		auth.POST("/platforms/douyin/bind", h.BindDouyin)
		auth.GET("/platforms/douyin/accounts", h.ListDouyinAccounts)
		auth.DELETE("/platforms/douyin/accounts/:id", h.DeleteDouyinAccount)
	}
}
