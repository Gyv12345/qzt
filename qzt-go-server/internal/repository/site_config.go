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
		"SiteName", "LogoURL", "FaviconURL", "Slogan", "Description",
		"ContactPhone", "ContactEmail", "ContactAddress", "ContactQQ", "ContactWechat", "WorkHours",
		"WeiboURL", "WechatQrURL", "LinkedInURL",
		"ICPBeian", "PublicSecurityBeian", "PublicSecurityBeianURL",
		"Keywords", "AnalyticsCode", "Copyright")
}

// Ensure 确保配置记录存在,不存在则用默认值创建。
func (r *SiteConfigRepo) Ensure(ctx context.Context, defaultCfg *model.SysSiteConfig) error {
	var existing model.SysSiteConfig
	err := dbFrom(ctx).First(&existing, 1).Error
	if err == nil {
		return nil
	}
	defaultCfg.ID = 1
	return dbFrom(ctx).Create(defaultCfg).Error
}
