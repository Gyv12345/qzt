package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// site_config.go 站点信息 repository。全局单条记录(id=1)。

type SiteConfigRepo struct {
	BaseRepo[model.SysSiteConfig]
}

func NewSiteConfigRepo() *SiteConfigRepo { return &SiteConfigRepo{} }

// Get 获取站点配置(id=1)。
func (r *SiteConfigRepo) Get(ctx context.Context) (*model.SysSiteConfig, error) {
	var cfg model.SysSiteConfig
	err := dbFrom(ctx).First(&cfg, 1).Error
	return &cfg, err
}

// Update 更新站点配置。
func (r *SiteConfigRepo) Update(ctx context.Context, cfg *model.SysSiteConfig) error {
	return r.BaseRepo.Update(ctx, cfg,
		"SiteName", "LogoURL", "FaviconURL",
		"HeroBadge", "HeroTitle", "HeroSubtitle", "Description",
		"Theme", "StatsJSON", "ModulesJSON", "CtaTitle", "CtaHighlight", "CtaSubtitle",
		"ContactPhone", "ContactEmail", "ContactAddress", "WorkHours",
		"ICPBeian", "PublicSecurityBeian", "PublicSecurityBeianURL",
		"Keywords", "AnalyticsCode", "Copyright", "McpURL")
}
