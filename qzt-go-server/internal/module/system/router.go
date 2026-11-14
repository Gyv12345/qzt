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
	versionHandler := handler.NewVersionHandler()
	wechatAuthHandler := handler.NewWechatAuthHandler()
	storageConfigHandler := handler.NewStorageConfigHandler()
	aiModelHandler := handler.NewAIModelHandler()
	tianyanchaHandler := handler.NewTianyanchaHandler()

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

	// 微信服务号免登录(公开,微信浏览器内 OAuth 回调后由移动端 SPA 携 code 调用)
	rg.GET("/auth/wechat/login-url", wechatAuthHandler.LoginURL)
	rg.POST("/auth/wechat/login", wechatAuthHandler.Login)

	// 站点信息(免鉴权,CMS/admin/h5 前台读取 logo/备案号等)
	rg.GET("/site-config", siteConfigHandler.Get)

	// 系统版本信息(免鉴权,admin「关于系统」弹窗与部署后核验用)
	rg.GET("/version", versionHandler.Get)

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

		// 微信服务号绑定/解绑(已登录用户)
		authenticated.GET("/auth/wechat/bind-url", wechatAuthHandler.BindURL)
		authenticated.GET("/auth/wechat/bind-status", wechatAuthHandler.BindStatus)
		authenticated.POST("/auth/wechat/bind", wechatAuthHandler.Bind)
		authenticated.DELETE("/auth/wechat/bind", wechatAuthHandler.Unbind)
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
		// 用户管理（只读）
		auth.GET("/users", userHandler.List)
		auth.GET("/users/:id", userHandler.GetByID)

		// 角色管理（只读）
		auth.GET("/roles", roleHandler.List)
		auth.GET("/roles/:id", roleHandler.GetByID)
		auth.GET("/roles/:id/apis", roleHandler.GetAPIs)

		// 菜单管理（只读）
		auth.GET("/menus/:id", menuHandler.GetByID)

		// API 管理（只读）
		auth.GET("/apis", apiHandler.List)
		auth.GET("/apis/:id", apiHandler.GetByID)

		// 字典管理（只读）
		auth.GET("/dicts", dictHandler.List)
		auth.GET("/dicts/:id", dictHandler.GetByID)

		// 操作日志（审计，只读）
		auth.GET("/operation-logs", operationLogHandler.List)
		auth.GET("/operation-logs/:id", operationLogHandler.GetByID)

		// 登录日志（审计）
		auth.GET("/login-logs", loginLogHandler.List)

		// 系统重置（超管专用，一键清理业务数据；演示模式护栏在 handler 内硬禁并给出专属文案）
		auth.POST("/reset", resetHandler.ResetBusinessData)

		// 系统配置（只读 + 缓存刷新；refresh 保持放行——演示开关翻转后依赖它同步缓存）
		auth.GET("/configs", configHandler.List)
		auth.POST("/configs/refresh", configHandler.Refresh)

		// 第三方登录配置（只读）
		auth.GET("/oauth-configs", oauthConfigHandler.List)
		auth.GET("/oauth-configs/:id", oauthConfigHandler.GetByID)

		// 首页板块配置（只读）
		auth.GET("/homepage-config", homepageConfigHandler.GetConfig)

		// 文件存储（配置列表 + 文件列表,只读;写操作在下方 frozen 组）
		auth.GET("/storage/configs", storageConfigHandler.List)
		auth.GET("/storage/files", storageConfigHandler.ListFiles)

		// AI 模型（档案列表 + 当前生效,只读;写操作在下方 frozen 组——
		// 模型切换绝不能被演示访客操作:含业务数据的提示词会被引到外部端点）
		auth.GET("/ai/models", aiModelHandler.List)
		auth.GET("/ai/models/current", aiModelHandler.Current)

		// 天眼查 MCP（配置只读;保存写操作在下方 frozen 组——演示访客不得改动
		// 含 API Key 的出网配置）
		auth.GET("/tianyancha/config", tianyanchaHandler.GetConfig)

		// 演示模式护栏：以下系统管理写接口在 demo.mode=1 时统一 403
		// 「演示模式不可修改系统配置」（middleware.DemoSystemWriteGuard），
		// 防公开演示访客改坏用户/角色/菜单/字典/系统配置/官网内容。
		frozen := auth.Group("", middleware.DemoSystemWriteGuard())
		{
			// 用户管理
			frozen.POST("/users", userHandler.Create)
			frozen.PUT("/users/:id", userHandler.Update)
			frozen.PUT("/users/:id/reset-password", userHandler.ResetPassword)
			frozen.DELETE("/users/:id", userHandler.Delete)

			// 角色管理
			frozen.POST("/roles", roleHandler.Create)
			frozen.PUT("/roles/:id", roleHandler.Update)
			frozen.DELETE("/roles/:id", roleHandler.Delete)
			frozen.PUT("/roles/:id/menus", roleHandler.SetMenus)
			frozen.PUT("/roles/:id/apis", roleHandler.SetAPIs)

			// 菜单管理
			frozen.POST("/menus", menuHandler.Create)
			frozen.PUT("/menus/:id", menuHandler.Update)
			frozen.DELETE("/menus/:id", menuHandler.Delete)

			// API 管理
			frozen.POST("/apis", apiHandler.Create)
			frozen.PUT("/apis/:id", apiHandler.Update)
			frozen.DELETE("/apis/:id", apiHandler.Delete)

			// 字典管理
			frozen.POST("/dicts", dictHandler.Create)
			frozen.PUT("/dicts/:id", dictHandler.Update)
			frozen.DELETE("/dicts/:id", dictHandler.Delete)

			// 操作日志（审计清空也冻结，保住演示期间的取证能力）
			frozen.DELETE("/operation-logs/:id", operationLogHandler.Delete)
			frozen.DELETE("/operation-logs", operationLogHandler.Clear)

			// 系统配置（存储配置走 config.yaml 无 API；sys_config 即系统配置面）
			frozen.POST("/configs", configHandler.Create)
			frozen.PUT("/configs", configHandler.BatchUpdate)
			frozen.PUT("/configs/:id", configHandler.Update)
			frozen.DELETE("/configs/:id", configHandler.Delete)

			// 第三方登录配置
			frozen.POST("/oauth-configs", oauthConfigHandler.Create)
			frozen.PUT("/oauth-configs/:id", oauthConfigHandler.Update)
			frozen.DELETE("/oauth-configs/:id", oauthConfigHandler.Delete)
			frozen.PUT("/oauth-configs/:id/enable", oauthConfigHandler.Enable)

			// 文件存储（写操作:保存/删除/启用热切换/测试连接）
			frozen.POST("/storage/configs", storageConfigHandler.Create)
			frozen.PUT("/storage/configs/:id", storageConfigHandler.Update)
			frozen.DELETE("/storage/configs/:id", storageConfigHandler.Delete)
			frozen.POST("/storage/configs/:id/activate", storageConfigHandler.Activate)
			frozen.POST("/storage/configs/:id/test", storageConfigHandler.Test)

			// AI 模型（写操作:保存/删除/启用热切换,演示模式冻结）
			frozen.POST("/ai/models", aiModelHandler.Create)
			frozen.PUT("/ai/models/:id", aiModelHandler.Update)
			frozen.DELETE("/ai/models/:id", aiModelHandler.Delete)
			frozen.POST("/ai/models/:id/activate", aiModelHandler.Activate)

			// 天眼查 MCP（保存:演示模式冻结）
			frozen.PUT("/tianyancha/config", tianyanchaHandler.SaveConfig)

			// 站点信息设置（官网对外内容）
			frozen.PUT("/site-config", siteConfigHandler.Update)

			// 首页板块配置（官网对外内容）
			frozen.PUT("/homepage-config/toggle", homepageConfigHandler.ToggleModule)
			frozen.PUT("/homepage-config/sync", homepageConfigHandler.SyncFeatures)
			frozen.DELETE("/homepage-config/features/:id", homepageConfigHandler.RemoveFeature)
		}
	}
}
