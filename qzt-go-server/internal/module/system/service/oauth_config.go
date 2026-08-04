package service

import (
	"context"
	"errors"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// oauth_config.go 第三方登录配置服务(管理端 CRUD)。
// 独立于通用 sys_config,有专门的管理页面。

// OauthConfigService 第三方登录配置服务。
type OauthConfigService struct {
	repo *repository.OauthConfigRepo
}

func NewOauthConfigService() *OauthConfigService {
	return &OauthConfigService{repo: repository.NewOauthConfigRepo()}
}

// CreateOauthConfigRequest 创建第三方登录配置。
type CreateOauthConfigRequest struct {
	Provider    string `json:"provider" binding:"required"`
	Name        string `json:"name"`
	AppID       string `json:"app_id"`
	AppSecret   string `json:"app_secret"`
	AgentID     string `json:"agent_id"`
	RedirectURI string `json:"redirect_uri"`
	Extra       string `json:"extra"`
	Sort        int    `json:"sort"`
	Remark      string `json:"remark"`
}

// Create 创建配置(每个 provider 仅一条)。
func (s *OauthConfigService) Create(ctx context.Context, req *CreateOauthConfigRequest) (*model.SysOauthConfig, error) {
	if !isValidProvider(req.Provider) {
		return nil, errors.New("不支持的渠道: " + req.Provider + "(当前支持: wecom)")
	}
	// 检查是否已存在
	if existing, err := s.repo.GetByProvider(ctx, req.Provider); err == nil && existing != nil {
		return nil, errors.New("渠道 " + req.Provider + " 已存在配置")
	}
	cfg := &model.SysOauthConfig{
		Provider:    req.Provider,
		Name:        req.Name,
		AppID:       req.AppID,
		AppSecret:   req.AppSecret,
		AgentID:     req.AgentID,
		RedirectURI: req.RedirectURI,
		Extra:       req.Extra,
		Sort:        req.Sort,
		Remark:      req.Remark,
		Enabled:     model.OauthDisabled, // 默认禁用,需手动启用
	}
	if err := s.repo.Create(ctx, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

// GetByID 配置详情(含 secret,仅管理员可见)。
func (s *OauthConfigService) GetByID(ctx context.Context, id uint) (*model.SysOauthConfig, error) {
	cfg, err := s.repo.GetByID(ctx, id)
	return cfg, notFoundOr(err, "配置不存在")
}

// UpdateOauthConfigRequest 更新配置。
type UpdateOauthConfigRequest struct {
	Name        string `json:"name"`
	AppID       string `json:"app_id"`
	AppSecret   string `json:"app_secret"`
	AgentID     string `json:"agent_id"`
	RedirectURI string `json:"redirect_uri"`
	Extra       string `json:"extra"`
	Sort        int    `json:"sort"`
	Remark      string `json:"remark"`
}

// Update 更新配置(AppSecret 为空时保留原值)。
func (s *OauthConfigService) Update(ctx context.Context, id uint, req *UpdateOauthConfigRequest) error {
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "配置不存在")
	}
	cfg.Name = req.Name
	cfg.AppID = req.AppID
	cfg.AgentID = req.AgentID
	cfg.RedirectURI = req.RedirectURI
	cfg.Extra = req.Extra
	cfg.Sort = req.Sort
	cfg.Remark = req.Remark
	if req.AppSecret != "" {
		cfg.AppSecret = req.AppSecret // 空串 = 不改
	}
	return s.repo.Update(ctx, cfg)
}

// Delete 删除配置。
func (s *OauthConfigService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "配置不存在")
	}
	return s.repo.Delete(ctx, id)
}

// List 全部配置列表(管理端)。
func (s *OauthConfigService) List(ctx context.Context) ([]model.SysOauthConfig, error) {
	q := &repository.QueryOptions{Order: []string{"sort ASC", "id ASC"}}
	return s.repo.List(ctx, q)
}

// Enable 启用/禁用配置。
func (s *OauthConfigService) Enable(ctx context.Context, id uint, enabled int8) error {
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "配置不存在")
	}
	if enabled == model.OauthEnabled {
		if cfg.AppID == "" || cfg.AppSecret == "" {
			return errors.New("AppID/AppSecret 未填写,无法启用")
		}
	}
	cfg.Enabled = enabled
	return s.repo.Update(ctx, cfg)
}

// ListEnabledPublic 列出已启用的渠道(登录页用,公开,不含 secret)。
type OauthProviderPublic struct {
	Provider string `json:"provider"`
	Name     string `json:"name"`
}

func (s *OauthConfigService) ListEnabledPublic(ctx context.Context) ([]OauthProviderPublic, error) {
	list, err := s.repo.ListEnabled(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]OauthProviderPublic, 0, len(list))
	for _, c := range list {
		out = append(out, OauthProviderPublic{Provider: c.Provider, Name: c.Name})
	}
	return out, nil
}

// GetWecomConfig 获取企业微信配置(扫码登录 service 用,含 secret)。
func (s *OauthConfigService) GetWecomConfig(ctx context.Context) (*model.SysOauthConfig, error) {
	return s.repo.GetEnabledByProvider(ctx, model.OAuthProviderWecom)
}

// isValidProvider 校验渠道类型。
func isValidProvider(p string) bool {
	switch p {
	case model.OAuthProviderWecom, model.OAuthProviderDing, model.OAuthProviderFeishu:
		return true
	}
	return false
}
