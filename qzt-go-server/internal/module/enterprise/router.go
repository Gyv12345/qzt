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
	msgHandler := handler.NewMessageHandler()
	noticeHandler := handler.NewNoticeHandler()
	jobHandler := handler.NewJobHandler()

	// 已认证路由(仅 JWT,无 RBAC):个人消息、公告流
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		// 消息中心(个人,免 RBAC)
		authenticated.GET("/messages/inbox", msgHandler.Inbox)
		authenticated.GET("/messages/outbox", msgHandler.Outbox)
		authenticated.GET("/messages/unread-count", msgHandler.UnreadCount)
		authenticated.GET("/messages/:id", msgHandler.GetByID)
		authenticated.POST("/messages", msgHandler.Send)
		authenticated.PUT("/messages/:id/read", msgHandler.MarkAsRead)
		authenticated.PUT("/messages/read-all", msgHandler.MarkAllAsRead)
		authenticated.PUT("/messages/read-batch", msgHandler.MarkAsReadByIds)
		authenticated.DELETE("/messages/:id", msgHandler.Delete)

		// 公告流(首页,免 RBAC)
		authenticated.GET("/notices/feed", noticeHandler.Feed)
		authenticated.GET("/notices/published", noticeHandler.Published)
		authenticated.GET("/notices/:id", noticeHandler.GetByID)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):公告管理、定时任务管理
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 公告管理
		auth.GET("/notices", noticeHandler.List)
		auth.POST("/notices", noticeHandler.Create)
		auth.PUT("/notices/:id", noticeHandler.Update)
		auth.PUT("/notices/:id/publish", noticeHandler.Publish)
		auth.PUT("/notices/:id/withdraw", noticeHandler.Withdraw)
		auth.DELETE("/notices/:id", noticeHandler.Delete)

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
