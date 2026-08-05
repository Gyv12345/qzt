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
}

// Update 更新站点信息。
func (s *SiteConfigService) Update(ctx context.Context, req *UpdateSiteConfigRequest) error {
	cfg, err := s.repo.Get(ctx)
	if err != nil {
		return errors.New("站点配置不存在")
	}
	cfg.SiteName = req.SiteName
	cfg.LogoURL = req.LogoURL
	cfg.FaviconURL = req.FaviconURL
	cfg.Slogan = req.Slogan
	cfg.HeroBadge = req.HeroBadge
	cfg.HeroTitle = req.HeroTitle
	cfg.HeroSubtitle = req.HeroSubtitle
	cfg.Description = req.Description
	cfg.ContactPhone = req.ContactPhone
	cfg.ContactEmail = req.ContactEmail
	cfg.ContactAddress = req.ContactAddress
	cfg.ContactQQ = req.ContactQQ
	cfg.ContactWechat = req.ContactWechat
	cfg.WorkHours = req.WorkHours
	cfg.WeiboURL = req.WeiboURL
	cfg.WechatQrURL = req.WechatQrURL
	cfg.LinkedInURL = req.LinkedInURL
	cfg.ICPBeian = req.ICPBeian
	cfg.PublicSecurityBeian = req.PublicSecurityBeian
	cfg.PublicSecurityBeianURL = req.PublicSecurityBeianURL
	cfg.Keywords = req.Keywords
	cfg.AnalyticsCode = req.AnalyticsCode
	cfg.Copyright = req.Copyright
	return s.repo.Update(ctx, cfg)
}

// notFoundOr 站点配置不存在时的友好提示。
func siteNotFoundOr(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("站点配置不存在")
	}
	return err
}
