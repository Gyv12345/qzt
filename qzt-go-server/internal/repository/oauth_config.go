package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// oauth_config.go 第三方登录配置 repository。

type OauthConfigRepo struct {
	BaseRepo[model.SysOauthConfig]
}

func NewOauthConfigRepo() *OauthConfigRepo { return &OauthConfigRepo{} }

// GetByProvider 按渠道获取配置(如 wecom)。
func (r *OauthConfigRepo) GetByProvider(ctx context.Context, provider string) (*model.SysOauthConfig, error) {
	var cfg model.SysOauthConfig
	if err := dbFrom(ctx).Where("provider = ?", provider).First(&cfg).Error; err != nil {
		return nil, err
	}
	return &cfg, nil
}

// GetEnabledByProvider 获取已启用的渠道配置(扫码登录时用)。
func (r *OauthConfigRepo) GetEnabledByProvider(ctx context.Context, provider string) (*model.SysOauthConfig, error) {
	var cfg model.SysOauthConfig
	if err := dbFrom(ctx).Where("provider = ? AND enabled = ?", provider, model.OauthEnabled).First(&cfg).Error; err != nil {
		return nil, err
	}
	return &cfg, nil
}

// ListEnabled 列出所有启用的渠道(登录页展示可用第三方登录方式)。
func (r *OauthConfigRepo) ListEnabled(ctx context.Context) ([]model.SysOauthConfig, error) {
	var list []model.SysOauthConfig
	if err := dbFrom(ctx).Where("enabled = ?", model.OauthEnabled).Order("sort ASC, id ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// Update 覆写泛型版本(不含 provider,provider 创建后不可改)。
func (r *OauthConfigRepo) Update(ctx context.Context, m *model.SysOauthConfig) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Enabled", "AppID", "AppSecret", "AgentID", "RedirectURI", "Extra", "Sort", "Remark")
}
