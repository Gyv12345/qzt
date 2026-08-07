package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// tools_config.go 系统配置相关 MCP tools(企业微信、站点设置)。
// 注:存储配置已迁移到配置文件(config.{env}.yaml + .env),不再走 DB/后台,故无 MCP 工具。

func registerConfigTools(s *server.MCPServer) {
	registerWecomConfigTools(s)
	registerSiteConfigTools(s)
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
