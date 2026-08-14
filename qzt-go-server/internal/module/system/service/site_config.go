package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// site_config.go 站点信息服务。后台管理 + 前台公开读取。

// SiteConfigService 站点信息服务。
type SiteConfigService struct {
	repo *repository.SiteConfigRepo
}

func NewSiteConfigService() *SiteConfigService {
	return &SiteConfigService{repo: repository.NewSiteConfigRepo()}
}

// Get 获取站点信息(后台管理 + 前台公开均用此方法)。
func (s *SiteConfigService) Get(ctx context.Context) (*model.SysSiteConfig, error) {
	cfg, err := s.repo.Get(ctx)
	return cfg, notFoundOr(err, "站点配置不存在")
}

// UpdateSiteConfigRequest 更新站点信息请求(全部可选,空值保留原值)。
type UpdateSiteConfigRequest struct {
	SiteName    string `json:"site_name"`
	LogoURL     string `json:"logo_url"`
	FaviconURL  string `json:"favicon_url"`
	Slogan      string `json:"slogan"`
	HeroBadge   string `json:"hero_badge"`
	HeroTitle   string `json:"hero_title"`
	HeroSubtitle string `json:"hero_subtitle"`
	Description string `json:"description"`

	ContactPhone   string `json:"contact_phone"`
	ContactEmail   string `json:"contact_email"`
	ContactAddress string `json:"contact_address"`
	ContactQQ      string `json:"contact_qq"`
	ContactWechat  string `json:"contact_wechat"`
	WorkHours      string `json:"work_hours"`

	WeiboURL    string `json:"weibo_url"`
	WechatQrURL string `json:"wechat_qr_url"`
	LinkedInURL string `json:"linkedin_url"`

	ICPBeian              string `json:"icp_beian"`
	PublicSecurityBeian   string `json:"public_security_beian"`
	PublicSecurityBeianURL string `json:"public_security_beian_url"`

	Keywords      string `json:"keywords"`
	AnalyticsCode string `json:"analytics_code"`
	Copyright     string `json:"copyright"`
	McpURL        string `json:"mcp_url"`
}

// Update 更新站点信息(部分更新:仅更新请求中非空字段,空值保留原值)。
func (s *SiteConfigService) Update(ctx context.Context, req *UpdateSiteConfigRequest) error {
	cfg, err := s.repo.Get(ctx)
	if err != nil {
		return errors.New("站点配置不存在")
	}
	// 仅覆盖非空字段,避免 MCP/admin 只传部分字段时把其他字段清空
	if req.SiteName != "" {
		cfg.SiteName = req.SiteName
	}
	if req.LogoURL != "" {
		cfg.LogoURL = req.LogoURL
	}
	if req.FaviconURL != "" {
		cfg.FaviconURL = req.FaviconURL
	}
	if req.Slogan != "" {
		cfg.Slogan = req.Slogan
	}
	if req.HeroBadge != "" {
		cfg.HeroBadge = req.HeroBadge
	}
	if req.HeroTitle != "" {
		cfg.HeroTitle = req.HeroTitle
	}
	if req.HeroSubtitle != "" {
		cfg.HeroSubtitle = req.HeroSubtitle
	}
	if req.Description != "" {
		cfg.Description = req.Description
	}
	if req.ContactPhone != "" {
		cfg.ContactPhone = req.ContactPhone
	}
	if req.ContactEmail != "" {
		cfg.ContactEmail = req.ContactEmail
	}
	if req.ContactAddress != "" {
		cfg.ContactAddress = req.ContactAddress
	}
	if req.ContactQQ != "" {
		cfg.ContactQQ = req.ContactQQ
	}
	if req.ContactWechat != "" {
		cfg.ContactWechat = req.ContactWechat
	}
	if req.WorkHours != "" {
		cfg.WorkHours = req.WorkHours
	}
	if req.WeiboURL != "" {
		cfg.WeiboURL = req.WeiboURL
	}
	if req.WechatQrURL != "" {
		cfg.WechatQrURL = req.WechatQrURL
	}
	if req.LinkedInURL != "" {
		cfg.LinkedInURL = req.LinkedInURL
	}
	if req.ICPBeian != "" {
		cfg.ICPBeian = req.ICPBeian
	}
	if req.PublicSecurityBeian != "" {
		cfg.PublicSecurityBeian = req.PublicSecurityBeian
	}
	if req.PublicSecurityBeianURL != "" {
		cfg.PublicSecurityBeianURL = req.PublicSecurityBeianURL
	}
	if req.Keywords != "" {
		cfg.Keywords = req.Keywords
	}
	if req.AnalyticsCode != "" {
		cfg.AnalyticsCode = req.AnalyticsCode
	}
	if req.Copyright != "" {
		cfg.Copyright = req.Copyright
	}
	if req.McpURL != "" {
		cfg.McpURL = req.McpURL
	}
	return s.repo.Update(ctx, cfg)
}

// notFoundOr 站点配置不存在时的友好提示。
func siteNotFoundOr(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("站点配置不存在")
	}
	return err
}
