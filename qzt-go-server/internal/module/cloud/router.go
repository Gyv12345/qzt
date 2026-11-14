package cloud

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/cloud/handler"
)

// Module 企业网盘模块。注册在 /cloud 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "cloud" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	cloudHandler := handler.NewCloudHandler()
	// 分享 handler 不注入 Uploader 实例(签名路径运行期懒取 app.GetUploader),
	// 保证存储配置热切换后即刻生效。
	shareHandler := handler.NewShareHandler()

	// 公开路由(免登录):分享链接访问与下载
	public := rg.Group("/public")
	{
		public.GET("/shares/:token", shareHandler.PublicGetShareMeta)
		public.POST("/shares/:token/download", shareHandler.PublicDownload)
	}

	// 已认证路由(仅 JWT,无 RBAC):个人空间操作
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.GET("/files", cloudHandler.List)
		authenticated.GET("/usage", cloudHandler.Usage)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		auth.POST("/folders", cloudHandler.CreateFolder)
		auth.POST("/files", cloudHandler.CreateFile)
		auth.PUT("/files/:id", cloudHandler.Update)
		auth.DELETE("/files/:id", cloudHandler.Delete)
		auth.POST("/shares", shareHandler.CreateShare)
		auth.GET("/shares", shareHandler.ListShares)
		auth.DELETE("/shares/:id", shareHandler.CancelShare)
	}
}
