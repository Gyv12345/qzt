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
	contactSyncHandler := handler.NewContactSyncHandler()
	imSSOHandler := handler.NewImSSOHandler()

	// 公开路由(无鉴权):钉钉/飞书扫码登录(login-only,不进 RBAC,照企微 OAuth 口径)
	rg.GET("/oauth/dingtalk/qr", imSSOHandler.DingtalkQR)
	rg.GET("/oauth/dingtalk/callback", imSSOHandler.DingtalkCallback)
	rg.GET("/oauth/feishu/qr", imSSOHandler.FeishuQR)
	rg.GET("/oauth/feishu/callback", imSSOHandler.FeishuCallback)

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

		// 通讯录同步(手动触发 + 最近一次状态;超管直通,
		// 其他角色经「第三方应用」页「钉钉同步/飞书同步」按钮授权)
		auth.POST("/contact-sync/dingtalk", contactSyncHandler.TriggerDingtalk)
		auth.POST("/contact-sync/feishu", contactSyncHandler.TriggerFeishu)
		auth.GET("/contact-sync/dingtalk/status", contactSyncHandler.StatusDingtalk)
		auth.GET("/contact-sync/feishu/status", contactSyncHandler.StatusFeishu)
	}
}
