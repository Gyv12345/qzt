package mcp

import (
	"qzt-go-server/internal/model"
	syservice "qzt-go-server/internal/module/system/service"
)

// config_service.go MCP tools 调用的系统配置 service 封装。
// 复用 system service,简化参数。

// ── 存储/OSS ──

func newSystemStorageSvc() *syservice.StorageConfigService { return syservice.NewStorageConfigService() }

// ── 企业微信(OAuth) ──

func newOauthSvc() *syservice.OauthConfigService { return syservice.NewOauthConfigService() }

type oauthCreateReq struct {
	Provider    string
	Name        string
	AppID       string
	AppSecret   string
	AgentID     string
	RedirectURI string
}

func (r *oauthCreateReq) toService() *syservice.CreateOauthConfigRequest {
	return &syservice.CreateOauthConfigRequest{
		Provider: r.Provider, Name: r.Name, AppID: r.AppID, AppSecret: r.AppSecret,
		AgentID: r.AgentID, RedirectURI: r.RedirectURI,
	}
}

type oauthUpdateReq struct {
	Name        string
	AppID       string
	AppSecret   string
	AgentID     string
	RedirectURI string
	Extra       string
	Sort        int
	Remark      string
}

func (r *oauthUpdateReq) toService() *syservice.UpdateOauthConfigRequest {
	return &syservice.UpdateOauthConfigRequest{
		Name: r.Name, AppID: r.AppID, AppSecret: r.AppSecret,
		AgentID: r.AgentID, RedirectURI: r.RedirectURI, Extra: r.Extra, Sort: r.Sort, Remark: r.Remark,
	}
}

// ── 站点设置 ──

func newSiteSvc() *syservice.SiteConfigService { return syservice.NewSiteConfigService() }

type siteUpdateReq struct {
	SiteName               string
	LogoURL                string
	FaviconURL             string
	Slogan                 string
	Description            string
	HeroBadge              string
	HeroTitle              string
	HeroSubtitle           string
	ContactPhone           string
	ContactEmail           string
	ContactAddress         string
	ContactQQ              string
	ContactWechat          string
	WorkHours              string
	WeiboURL               string
	WechatQrURL            string
	LinkedInURL            string
	ICPBeian               string
	PublicSecurityBeian    string
	PublicSecurityBeianURL string
	Keywords               string
	AnalyticsCode          string
	Copyright              string
}

func (r *siteUpdateReq) toService() *syservice.UpdateSiteConfigRequest {
	return &syservice.UpdateSiteConfigRequest{
		SiteName: r.SiteName, LogoURL: r.LogoURL, FaviconURL: r.FaviconURL,
		Slogan: r.Slogan, Description: r.Description,
		HeroBadge: r.HeroBadge, HeroTitle: r.HeroTitle, HeroSubtitle: r.HeroSubtitle,
		ContactPhone: r.ContactPhone, ContactEmail: r.ContactEmail,
		ContactAddress: r.ContactAddress, ContactQQ: r.ContactQQ,
		ContactWechat: r.ContactWechat, WorkHours: r.WorkHours,
		WeiboURL: r.WeiboURL, WechatQrURL: r.WechatQrURL, LinkedInURL: r.LinkedInURL,
		ICPBeian: r.ICPBeian, PublicSecurityBeian: r.PublicSecurityBeian,
		PublicSecurityBeianURL: r.PublicSecurityBeianURL,
		Keywords: r.Keywords, AnalyticsCode: r.AnalyticsCode, Copyright: r.Copyright,
	}
}

// _ 避免 model unused
var _ = model.SysOauthConfig{}
