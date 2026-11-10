// Package open 开放集成模块(P17 开放集成地基)。
//
// 两组路由:
//   - 管理组 /open/webhooks* /open/webhook-events* —— JWT+Casbin,后台管理 webhook 配置与日志
//   - 开放组 /open/v1/* —— middleware.Auth(JWT 或 qzt_ API Key 双源)+ 每调用方令牌桶限流
//
// 事件经 xevent 总线订阅转发为出站 webhook;详见 service 包。
package open

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/open/handler"
	e "qzt-go-server/pkg/xerror"
	"qzt-go-server/pkg/xlimiter"
	"qzt-go-server/pkg/xresponse"
)

// OpenRateLimit 开放 API 每调用方限流(进程内令牌桶,120 次/分钟)。
// key 优先取 API Key ID,回退 JWT 用户 ID。
func OpenRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		caller := c.GetString(middleware.CtxUserIDKey)
		if v, ok := c.Get("_api_key_id"); ok {
			if id, ok2 := v.(uint); ok2 && id > 0 {
				caller = "k" + strconv.FormatUint(uint64(id), 10)
			}
		}
		lim, _ := xlimiter.NewTokenBucket("open:"+caller, xlimiter.BucketEvery(time.Minute/120), 120)
		if lim != nil && !lim.Allow() {
			xresponse.Fail(c, e.HttpTooManyRequests.GetErrCode(), "请求过于频繁")
			c.Abort()
			return
		}
		c.Next()
	}
}

// Module 开放集成模块。实现 server.Module 接口,注册在 /open 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "open" }

// RegisterRoutes 路由注册。
func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	webhookHandler := handler.NewWebhookHandler()
	openapiHandler := handler.NewOpenAPIHandler()

	// 管理组:JWT + 操作日志 + Casbin(OperationLog 在 Casbin 之前,403 也被审计)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.GET("/webhooks", webhookHandler.List)
		auth.POST("/webhooks", webhookHandler.Create)
		auth.GET("/webhooks/:id", webhookHandler.Get)
		auth.PUT("/webhooks/:id", webhookHandler.Update)
		auth.DELETE("/webhooks/:id", webhookHandler.Delete)
		auth.PUT("/webhooks/:id/status", webhookHandler.SetStatus)

		auth.GET("/webhook-events", webhookHandler.ListEvents)
		auth.POST("/webhook-events/:id/retry", webhookHandler.RetryEvent)
	}

	// 开放组:双源认证 + 限流 + Casbin(API Key 继承 owner 角色)
	v1 := rg.Group("/v1", middleware.Auth(app.JwtManager), OpenRateLimit(), middleware.CasbinRBAC())
	{
		v1.GET("/events", openapiHandler.Events)
		v1.GET("/org/tree", openapiHandler.OrgTree)
	}
}
