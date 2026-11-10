package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	geo "qzt-go-server/internal/model/geo"
	georepo "qzt-go-server/internal/repository/geo"

	"gorm.io/gorm"
)

// config.go 提示词库与平台的 CRUD。分层约束：handler 只进这里，不直接碰 repository。

// PromptPayload 提示词新增/编辑入参。
type PromptPayload struct {
	Question  string `json:"question"`
	GroupType string `json:"group_type"` // brand/category/scenario
	Enabled   *bool  `json:"enabled"`
	Sort      int    `json:"sort"`
	Remark    string `json:"remark"`
}

// ListPrompts 分页列表（group_type/keyword 可选筛选）。
func (s *MonitorService) ListPrompts(ctx context.Context, page, pageSize int, groupType, keyword string) ([]geo.GeoPrompt, int64, error) {
	return georepo.NewPromptRepo().PageList(ctx, page, pageSize, groupType, keyword)
}

// CreatePrompt 新增提示词。
func (s *MonitorService) CreatePrompt(ctx context.Context, p *PromptPayload) (*geo.GeoPrompt, error) {
	m, err := p.toModel(nil)
	if err != nil {
		return nil, err
	}
	m.Enabled = true // 默认启用，除非显式关闭
	if p.Enabled != nil {
		m.Enabled = *p.Enabled
	}
	if err := georepo.NewPromptRepo().Create(ctx, m); err != nil {
		return nil, fmt.Errorf("新增提示词失败: %w", err)
	}
	return m, nil
}

// UpdatePrompt 编辑提示词（全量字段）。
func (s *MonitorService) UpdatePrompt(ctx context.Context, id uint, p *PromptPayload) error {
	old, err := georepo.NewPromptRepo().GetByID(ctx, id)
	if err != nil {
		return errors.New("提示词不存在")
	}
	m, err := p.toModel(nil)
	if err != nil {
		return err
	}
	m.ID = id
	m.CreatedAt = old.CreatedAt // 全量 Save 会落库 CreatedAt,零值会写 NULL(Err 1048)
	if p.Enabled != nil {
		m.Enabled = *p.Enabled
	}
	return georepo.NewPromptRepo().Update(ctx, m)
}

// DeletePrompt 删除提示词。
func (s *MonitorService) DeletePrompt(ctx context.Context, id uint) error {
	return georepo.NewPromptRepo().Delete(ctx, id)
}

func (p *PromptPayload) toModel(_ *geo.GeoPrompt) (*geo.GeoPrompt, error) {
	p.Question = strings.TrimSpace(p.Question)
	if p.Question == "" {
		return nil, errors.New("问题不能为空")
	}
	switch p.GroupType {
	case "brand", "category", "scenario":
	case "":
		p.GroupType = "category"
	default:
		return nil, errors.New("分组必须是 brand/category/scenario")
	}
	return &geo.GeoPrompt{
		Question:  p.Question,
		GroupType: p.GroupType,
		Sort:      p.Sort,
		Remark:    p.Remark,
	}, nil
}

// PlatformPayload 平台新增/编辑入参。APIKey 编辑留空保留原值。
type PlatformPayload struct {
	Name    string `json:"name"`
	BaseURL string `json:"base_url"`
	APIKey  string `json:"api_key"`
	Model   string `json:"model"`
	Enabled *bool  `json:"enabled"`
	Remark  string `json:"remark"`
}

// PlatformView 平台对外视图（key 只出掩码与是否已配置）。
type PlatformView struct {
	geo.GeoPlatform
	APIKeySet  bool   `json:"api_key_set"`
	APIKeyMask string `json:"api_key_mask"`
}

// ListPlatforms 全部平台（掩码视图）。
func (s *MonitorService) ListPlatforms(ctx context.Context) ([]PlatformView, error) {
	list, err := georepo.NewPlatformRepo().ListAll(ctx)
	if err != nil {
		return nil, err
	}
	views := make([]PlatformView, 0, len(list))
	for _, p := range list {
		views = append(views, toPlatformView(p))
	}
	return views, nil
}

// CreatePlatform 新增平台。
func (s *MonitorService) CreatePlatform(ctx context.Context, p *PlatformPayload) (*PlatformView, error) {
	m, err := p.toModel()
	if err != nil {
		return nil, err
	}
	m.Enabled = true
	if p.Enabled != nil {
		m.Enabled = *p.Enabled
	}
	if err := georepo.NewPlatformRepo().Create(ctx, m); err != nil {
		return nil, fmt.Errorf("新增平台失败: %w", err)
	}
	v := toPlatformView(*m)
	return &v, nil
}

// UpdatePlatform 编辑平台；APIKey 留空保留原值。
func (s *MonitorService) UpdatePlatform(ctx context.Context, id uint, p *PlatformPayload) error {
	old, err := georepo.NewPlatformRepo().GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("平台不存在")
		}
		return err
	}
	m, err := p.toModel()
	if err != nil {
		return err
	}
	m.ID = id
	m.CreatedAt = old.CreatedAt // 全量 Save 会落库 CreatedAt,零值会写 NULL(Err 1048)
	if strings.TrimSpace(p.APIKey) == "" {
		m.APIKey = old.APIKey
	}
	if p.Enabled != nil {
		m.Enabled = *p.Enabled
	}
	return georepo.NewPlatformRepo().Update(ctx, m)
}

// DeletePlatform 删除平台。
func (s *MonitorService) DeletePlatform(ctx context.Context, id uint) error {
	return georepo.NewPlatformRepo().Delete(ctx, id)
}

func (p *PlatformPayload) toModel() (*geo.GeoPlatform, error) {
	p.Name = strings.TrimSpace(p.Name)
	p.BaseURL = strings.TrimRight(strings.TrimSpace(p.BaseURL), "/")
	p.Model = strings.TrimSpace(p.Model)
	if p.Name == "" {
		return nil, errors.New("平台名不能为空")
	}
	if p.BaseURL == "" {
		return nil, errors.New("API 根地址不能为空")
	}
	if p.Model == "" {
		return nil, errors.New("模型名不能为空")
	}
	return &geo.GeoPlatform{
		Name:    p.Name,
		BaseURL: p.BaseURL,
		APIKey:  strings.TrimSpace(p.APIKey),
		Model:   p.Model,
		Remark:  p.Remark,
	}, nil
}

func toPlatformView(p geo.GeoPlatform) PlatformView {
	return PlatformView{
		GeoPlatform: p,
		APIKeySet:   p.APIKeySet(),
		APIKeyMask:  p.MaskedKey(),
	}
}
