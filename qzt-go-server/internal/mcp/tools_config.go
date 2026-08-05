package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/repository"
	syservice "qzt-go-server/internal/module/system/service"
)

// tools_config.go 系统配置相关 MCP tools(存储/OSS、企业微信、站点设置)。

func registerConfigTools(s *server.MCPServer) {
	registerStorageConfigTools(s)
	registerWecomConfigTools(s)
	registerSiteConfigTools(s)
}

// ═══════════════════════════════════════════
// 存储/OSS 配置
// ═══════════════════════════════════════════

func registerStorageConfigTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("storage_config_get",
			mcp.WithDescription("获取当前文件存储配置(本地/OSS驱动、OSS Endpoint/Bucket等)。Secret脱敏不返回。"),
		),
		handleStorageConfigGet,
	)

	s.AddTool(
		mcp.NewTool("storage_config_update",
			mcp.WithDescription("更新文件存储配置并自动重建上传驱动(无需重启服务)"),
			mcp.WithString("driver", mcp.Required(), mcp.Description("存储驱动: local 或 oss")),
			mcp.WithString("local_path", mcp.Description("本地存储路径(driver=local)")),
			mcp.WithString("resource_domain", mcp.Description("本地资源访问域名(driver=local)")),
			mcp.WithString("oss_endpoint", mcp.Description("OSS Endpoint(driver=oss),如 oss-cn-hangzhou.aliyuncs.com")),
			mcp.WithString("oss_access_key_id", mcp.Description("OSS AccessKeyID")),
			mcp.WithString("oss_access_key_secret", mcp.Description("OSS AccessKeySecret(空=不改)")),
			mcp.WithString("oss_bucket_name", mcp.Description("OSS Bucket名称")),
			mcp.WithString("oss_custom_domain", mcp.Description("OSS CDN/自定义域名")),
			mcp.WithNumber("max_upload_mb", mcp.Description("单文件大小上限(MB)")),
		),
		handleStorageConfigUpdate,
	)

	s.AddTool(
		mcp.NewTool("storage_config_test",
			mcp.WithDescription("测试OSS连接是否有效(不修改已保存的配置)。local模式检查目录权限。"),
			mcp.WithString("driver", mcp.Required(), mcp.Description("local 或 oss")),
			mcp.WithString("oss_endpoint", mcp.Description("OSS Endpoint")),
			mcp.WithString("oss_access_key_id", mcp.Description("OSS AK")),
			mcp.WithString("oss_access_key_secret", mcp.Description("OSS SK")),
			mcp.WithString("oss_bucket_name", mcp.Description("OSS Bucket")),
		),
		handleStorageConfigTest,
	)
}

func handleStorageConfigGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	repo := repository.NewStorageConfigRepo()
	cfg, err := repo.Get(ctx)
	if err != nil {
		return resultError("存储配置不存在,请先在后台设置")
	}
	return resultText(cfg)
}

func handleStorageConfigUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	repo := repository.NewStorageConfigRepo()
	cfg, err := repo.Get(ctx)
	if err != nil {
		return resultError("存储配置不存在")
	}

	driver := req.GetString("driver", cfg.Driver)
	if driver != "local" && driver != "oss" {
		return resultError("driver 只能是 local 或 oss")
	}

	cfg.Driver = driver
	cfg.LocalPath = req.GetString("local_path", cfg.LocalPath)
	cfg.ResourceDomain = req.GetString("resource_domain", cfg.ResourceDomain)
	cfg.OSSEndpoint = req.GetString("oss_endpoint", cfg.OSSEndpoint)
	cfg.OSSAccessKeyID = req.GetString("oss_access_key_id", cfg.OSSAccessKeyID)
	cfg.OSSBucketName = req.GetString("oss_bucket_name", cfg.OSSBucketName)
	cfg.OSSCustomDomain = req.GetString("oss_custom_domain", cfg.OSSCustomDomain)
	if secret := req.GetString("oss_access_key_secret", ""); secret != "" {
		cfg.OSSAccessKeySecret = secret
	}
	if mb := int(req.GetFloat("max_upload_mb", 0)); mb > 0 {
		cfg.MaxUploadMB = mb
	}

	if err := repo.Update(ctx, cfg); err != nil {
		return resultError(fmt.Sprintf("保存失败: %v", err))
	}

	// 重建 Uploader
	if err := app.ReloadUploader(
		cfg.Driver, cfg.LocalPath, cfg.ResourceDomain,
		cfg.OSSEndpoint, cfg.OSSAccessKeyID, cfg.OSSAccessKeySecret,
		cfg.OSSBucketName, cfg.OSSCustomDomain, cfg.MaxUploadMB,
	); err != nil {
		return resultError(fmt.Sprintf("配置已保存但重建驱动失败: %v", err))
	}

	return resultText(map[string]interface{}{"message": "存储配置已更新并生效", "driver": cfg.Driver})
}

func handleStorageConfigTest(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	driver := req.GetString("driver", "")
	if driver == "local" {
		return resultText(map[string]interface{}{"message": "local 模式无需测试连接"})
	}

	endpoint := req.GetString("oss_endpoint", "")
	ak := req.GetString("oss_access_key_id", "")
	sk := req.GetString("oss_access_key_secret", "")
	bucket := req.GetString("oss_bucket_name", "")
	if endpoint == "" || ak == "" || sk == "" || bucket == "" {
		return resultError("OSS 配置不完整: endpoint/access_key_id/access_key_secret/bucket 均必填")
	}

	svc := newSystemStorageSvc()
	err := svc.TestConnection(ctx, &syservice.UpdateStorageConfigRequest{
		Driver: driver, OSSEndpoint: endpoint,
		OSSAccessKeyID: ak, OSSAccessKeySecret: sk, OSSBucketName: bucket,
	})
	if err != nil {
		return resultError(fmt.Sprintf("OSS 连接失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "OSS 连接成功"})
}

// ═══════════════════════════════════════════
// 企业微信配置
// ═══════════════════════════════════════════

func registerWecomConfigTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("wecom_config_list",
			mcp.WithDescription("获取所有第三方登录配置列表(含企业微信)"),
		),
		handleWecomConfigList,
	)

	s.AddTool(
		mcp.NewTool("wecom_config_create",
			mcp.WithDescription("创建企业微信扫码登录配置"),
			mcp.WithString("app_id", mcp.Required(), mcp.Description("企业微信 CorpID")),
			mcp.WithString("app_secret", mcp.Required(), mcp.Description("自建应用 Secret")),
			mcp.WithString("agent_id", mcp.Description("自建应用 AgentID")),
			mcp.WithString("redirect_uri", mcp.Description("扫码回调地址")),
			mcp.WithString("name", mcp.Description("显示名称(默认'企业微信扫码登录')")),
		),
		handleWecomConfigCreate,
	)

	s.AddTool(
		mcp.NewTool("wecom_config_update",
			mcp.WithDescription("更新企业微信配置(app_secret为空则不改)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("配置ID")),
			mcp.WithString("app_id", mcp.Description("CorpID")),
			mcp.WithString("app_secret", mcp.Description("Secret(空=不改)")),
			mcp.WithString("agent_id", mcp.Description("AgentID")),
			mcp.WithString("redirect_uri", mcp.Description("回调地址")),
		),
		handleWecomConfigUpdate,
	)

	s.AddTool(
		mcp.NewTool("wecom_config_enable",
			mcp.WithDescription("启用或禁用企业微信登录"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("配置ID")),
			mcp.WithBoolean("enabled", mcp.Required(), mcp.Description("true启用 false禁用")),
		),
		handleWecomConfigEnable,
	)
}

func handleWecomConfigList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newOauthSvc()
	list, err := svc.List(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询失败: %v", err))
	}
	return resultText(list)
}

func handleWecomConfigCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newOauthSvc()
	name := req.GetString("name", "企业微信扫码登录")
	createReq := &oauthCreateReq{
		Provider: "wecom", Name: name,
		AppID: req.GetString("app_id", ""), AppSecret: req.GetString("app_secret", ""),
		AgentID: req.GetString("agent_id", ""), RedirectURI: req.GetString("redirect_uri", ""),
	}
	cfg, err := svc.Create(ctx, createReq.toService())
	if err != nil {
		return resultError(fmt.Sprintf("创建失败: %v", err))
	}
	return resultText(cfg)
}

func handleWecomConfigUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newOauthSvc()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("id 必填")
	}
	updateReq := &oauthUpdateReq{
		AppID: req.GetString("app_id", ""), AgentID: req.GetString("agent_id", ""),
		RedirectURI: req.GetString("redirect_uri", ""),
	}
	if secret := req.GetString("app_secret", ""); secret != "" {
		updateReq.AppSecret = secret
	}
	if err := svc.Update(ctx, id, updateReq.toService()); err != nil {
		return resultError(fmt.Sprintf("更新失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "企业微信配置已更新"})
}

func handleWecomConfigEnable(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newOauthSvc()
	id := uint(req.GetFloat("id", 0))
	enabled := int8(0)
	if req.GetBool("enabled", false) {
		enabled = 1
	}
	if err := svc.Enable(ctx, id, enabled); err != nil {
		return resultError(fmt.Sprintf("操作失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "企业微信登录已" + map[int8]string{0: "禁用", 1: "启用"}[enabled]})
}

// ═══════════════════════════════════════════
// 站点设置
// ═══════════════════════════════════════════

func registerSiteConfigTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("site_config_get",
			mcp.WithDescription("获取站点信息(企业名称/logo/联系方式/备案号等)"),
		),
		handleSiteConfigGet,
	)

	s.AddTool(
		mcp.NewTool("site_config_update",
			mcp.WithDescription("更新站点信息(logo/企业名/联系方式/备案号/公安备案/SEO/首页Hero等)"),
			mcp.WithString("site_name", mcp.Description("企业名称")),
			mcp.WithString("logo_url", mcp.Description("Logo图片URL")),
			mcp.WithString("favicon_url", mcp.Description("Favicon图标URL")),
			mcp.WithString("slogan", mcp.Description("品牌标语")),
			mcp.WithString("description", mcp.Description("站点描述(SEO)")),
			mcp.WithString("hero_badge", mcp.Description("首页Hero小标签,如 企业级业务管理平台")),
			mcp.WithString("hero_title", mcp.Description("首页Hero大标题(留空用企业名称)")),
			mcp.WithString("hero_subtitle", mcp.Description("首页Hero副标题(留空用站点描述)")),
			mcp.WithString("contact_phone", mcp.Description("联系电话")),
			mcp.WithString("contact_email", mcp.Description("联系邮箱")),
			mcp.WithString("contact_address", mcp.Description("公司地址")),
			mcp.WithString("work_hours", mcp.Description("工作时间")),
			mcp.WithString("icp_beian", mcp.Description("ICP备案号")),
			mcp.WithString("public_security_beian", mcp.Description("公安备案号")),
			mcp.WithString("public_security_beian_url", mcp.Description("公安备案跳转链接")),
			mcp.WithString("keywords", mcp.Description("SEO关键词")),
			mcp.WithString("copyright", mcp.Description("版权声明")),
		),
		handleSiteConfigUpdate,
	)
}

func handleSiteConfigGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newSiteSvc()
	cfg, err := svc.Get(ctx)
	if err != nil {
		return resultError("站点配置不存在")
	}
	return resultText(cfg)
}

func handleSiteConfigUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := newSiteSvc()
	updateReq := &siteUpdateReq{
		SiteName: req.GetString("site_name", ""),
		LogoURL:  req.GetString("logo_url", ""),
		FaviconURL: req.GetString("favicon_url", ""),
		Slogan:   req.GetString("slogan", ""),
		Description: req.GetString("description", ""),
		HeroBadge:    req.GetString("hero_badge", ""),
		HeroTitle:    req.GetString("hero_title", ""),
		HeroSubtitle: req.GetString("hero_subtitle", ""),
		ContactPhone:   req.GetString("contact_phone", ""),
		ContactEmail:   req.GetString("contact_email", ""),
		ContactAddress: req.GetString("contact_address", ""),
		WorkHours:      req.GetString("work_hours", ""),
		ICPBeian:       req.GetString("icp_beian", ""),
		PublicSecurityBeian:   req.GetString("public_security_beian", ""),
		PublicSecurityBeianURL: req.GetString("public_security_beian_url", ""),
		Keywords:    req.GetString("keywords", ""),
		Copyright:   req.GetString("copyright", ""),
	}
	if err := svc.Update(ctx, updateReq.toService()); err != nil {
		return resultError(fmt.Sprintf("更新失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "站点信息已更新"})
}
