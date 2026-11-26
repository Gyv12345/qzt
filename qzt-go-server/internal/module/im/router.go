// router.go 即时通讯(IM)模块路由。实现 server.Module 接口,注册在 /im 下。
// 全部路由走 JWT-only 层级(同 OA 站内信:个人消息场景,无 OperationLog/CasbinRBAC)。
package im

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/im/handler"
)

// Module 即时通讯模块。
type Module struct{}

// New 构造。
func New() *Module { return &Module{} }

// Name 模块名,即 URL 前缀 /im。
func (m *Module) Name() string { return "im" }

// RegisterRoutes 注册路由。
func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	h := handler.NewIMHandler()

	// 已认证路由(仅 JWT,无 RBAC):IM 为个人消息场景,同 OA 站内信层级
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		// 会话
		authenticated.GET("/conversations", h.ListConversations)
		authenticated.POST("/conversations/single", h.CreateSingle)
		authenticated.POST("/conversations/group", h.CreateGroup)
		// 消息
		authenticated.GET("/conversations/:id/messages", h.ListMessages)
		authenticated.POST("/conversations/:id/messages", h.SendMessage)
		// 已读
		authenticated.PUT("/conversations/:id/read", h.MarkRead)
		// 成员管理
		authenticated.POST("/conversations/:id/members", h.AddMembers)
		authenticated.DELETE("/conversations/:id/members/:userId", h.RemoveMember)
	}
}
