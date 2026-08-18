package system

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/handler"
)

// Module 系统管理模块。实现 server.Module 接口，注册在 /system 下。
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "system"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	authHandler := handler.NewAuthHandler()
	userHandler := handler.NewUserHandler()
	roleHandler := handler.NewRoleHandler()
	menuHandler := handler.NewMenuHandler()
	apiHandler := handler.NewAPIHandler()
	dictHandler := handler.NewDictHandler()
	operationLogHandler := handler.NewOperationLogHandler()
	loginLogHandler := handler.NewLoginLogHandler()
	resetHandler := handler.NewResetHandler()
	configHandler := handler.NewConfigHandler()
	oauthConfigHandler := handler.NewOauthConfigHandler()
	apiKeyHandler := handler.NewApiKeyHandler()
	siteConfigHandler := handler.NewSiteConfigHandler()
	homepageConfigHandler := handler.NewHomepageConfigHandler()

	// 公开路由（无需鉴权）：登录、刷新令牌、企业微信扫码登录、已启用第三方登录列表
	rg.POST("/auth/login", middleware.LoginLimit(), authHandler.Login)
	rg.POST("/auth/refresh", authHandler.Refresh)
	rg.GET("/auth/wecom/qrcode", authHandler.WecomQrcode)
	rg.POST("/auth/wecom/callback", authHandler.WecomCallback)
	rg.GET("/auth/wecom/login-status", authHandler.WecomLoginStatus)
	rg.GET("/oauth-configs/enabled", oauthConfigHandler.ListPublic)

	// 企业微信绑定(公开,跨设备扫码用,无需JWT)
	rg.GET("/auth/wecom/bind-oauth-url", authHandler.WecomBindOauthURL)
	rg.GET("/auth/wecom/bind-callback", authHandler.WecomBindRedirect)
	rg.POST("/auth/wecom/bind-callback", authHandler.WecomBindCallback)

	// 站点信息(免鉴权,CMS/admin/h5 前台读取 logo/备案号等)
	rg.GET("/site-config", siteConfigHandler.Get)

	// 公开路由(免鉴权):官网团队展示
	rg.GET("/public/team", userHandler.PublicTeam)

	// 公开路由(免鉴权):CMS 首页板块配置
	rg.GET("/public/homepage-config", homepageConfigHandler.PublicHomepage)

	// 已认证路由（仅 JWT，无 RBAC）：个人资料、下拉选项等查询
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.POST("/auth/logout", authHandler.Logout)
		authenticated.GET("/auth/profile", authHandler.GetProfile)
		authenticated.PUT("/auth/profile", authHandler.UpdateProfile)
		authenticated.PUT("/auth/password", authHandler.ChangePassword)
		authenticated.GET("/auth/permissions", authHandler.GetPermissions)

		// 企业微信绑定/解绑(已登录用户)
		authenticated.GET("/auth/wecom/bind-qrcode", authHandler.WecomBindQrcode)
		authenticated.GET("/auth/wecom/bind-status", authHandler.WecomBindStatus)
		authenticated.POST("/auth/wecom/bind", authHandler.WecomBind)
		authenticated.DELETE("/auth/wecom/bind", authHandler.WecomUnbind)
		authenticated.GET("/menus/user", menuHandler.GetUserMenuTree)
		authenticated.GET("/menus/tree", menuHandler.GetTree)
		authenticated.GET("/roles/all", roleHandler.ListAll)
		authenticated.GET("/users/options", userHandler.ListOptions)
		authenticated.GET("/apis/all", apiHandler.ListAll)
		authenticated.GET("/dicts/all", dictHandler.ListAll)

		// API Key 管理(仅 JWT,不允许用 API Key 创建 API Key)
		authenticated.POST("/api-keys", apiKeyHandler.Create)
		authenticated.GET("/api-keys", apiKeyHandler.List)
		authenticated.GET("/api-keys/toolsets", apiKeyHandler.Toolsets)
		authenticated.PUT("/api-keys/:id", apiKeyHandler.Update)
		authenticated.DELETE("/api-keys/:id", apiKeyHandler.Delete)
		authenticated.PUT("/api-keys/:id/disable", apiKeyHandler.Disable)
	}

	// 受保护路由（JWT + 操作日志 + Casbin RBAC）：CRUD 管理操作。
	// OperationLog 位于 auth 与 RBAC 之间，使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 用户管理
		auth.GET("/users", userHandler.List)
		auth.POST("/users", userHandler.Create)
		auth.GET("/users/:id", userHandler.GetByID)
		auth.PUT("/users/:id", userHandler.Update)
		auth.PUT("/users/:id/reset-password", userHandler.ResetPassword)
		auth.DELETE("/users/:id", userHandler.Delete)

		// 角色管理
		auth.GET("/roles", roleHandler.List)
		auth.POST("/roles", roleHandler.Create)
		auth.GET("/roles/:id", roleHandler.GetByID)
		auth.PUT("/roles/:id", roleHandler.Update)
		auth.DELETE("/roles/:id", roleHandler.Delete)
		auth.PUT("/roles/:id/menus", roleHandler.SetMenus)
		auth.GET("/roles/:id/apis", roleHandler.GetAPIs)
		auth.PUT("/roles/:id/apis", roleHandler.SetAPIs)

		// 菜单管理
		auth.POST("/menus", menuHandler.Create)
		auth.GET("/menus/:id", menuHandler.GetByID)
		auth.PUT("/menus/:id", menuHandler.Update)
		auth.DELETE("/menus/:id", menuHandler.Delete)

		// API 管理
		auth.GET("/apis", apiHandler.List)
		auth.POST("/apis", apiHandler.Create)
		auth.GET("/apis/:id", apiHandler.GetByID)
		auth.PUT("/apis/:id", apiHandler.Update)
		auth.DELETE("/apis/:id", apiHandler.Delete)

		// 字典管理
		auth.GET("/dicts", dictHandler.List)
		auth.POST("/dicts", dictHandler.Create)
		auth.GET("/dicts/:id", dictHandler.GetByID)
		auth.PUT("/dicts/:id", dictHandler.Update)
		auth.DELETE("/dicts/:id", dictHandler.Delete)

		// 操作日志（审计）
		auth.GET("/operation-logs", operationLogHandler.List)
		auth.GET("/operation-logs/:id", operationLogHandler.GetByID)
		auth.DELETE("/operation-logs/:id", operationLogHandler.Delete)
		auth.DELETE("/operation-logs", operationLogHandler.Clear)

		// 登录日志（审计）
		auth.GET("/login-logs", loginLogHandler.List)

		// 系统重置（超管专用，一键清理业务数据）
		auth.POST("/reset", resetHandler.ResetBusinessData)

		// 系统配置
		auth.GET("/configs", configHandler.List)
		auth.POST("/configs", configHandler.Create)
		auth.PUT("/configs", configHandler.BatchUpdate)
		auth.PUT("/configs/:id", configHandler.Update)
		auth.DELETE("/configs/:id", configHandler.Delete)
		auth.POST("/configs/refresh", configHandler.Refresh)

		// 第三方登录配置
		auth.GET("/oauth-configs", oauthConfigHandler.List)
		auth.POST("/oauth-configs", oauthConfigHandler.Create)
		auth.GET("/oauth-configs/:id", oauthConfigHandler.GetByID)
		auth.PUT("/oauth-configs/:id", oauthConfigHandler.Update)
		auth.DELETE("/oauth-configs/:id", oauthConfigHandler.Delete)
		auth.PUT("/oauth-configs/:id/enable", oauthConfigHandler.Enable)

		// 站点信息设置
		auth.PUT("/site-config", siteConfigHandler.Update)

		// 首页板块配置
		auth.GET("/homepage-config", homepageConfigHandler.GetConfig)
		auth.PUT("/homepage-config/toggle", homepageConfigHandler.ToggleModule)
		auth.PUT("/homepage-config/sync", homepageConfigHandler.SyncFeatures)
		auth.DELETE("/homepage-config/features/:id", homepageConfigHandler.RemoveFeature)
	}
}
