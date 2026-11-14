package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/repository"
)

// tianyancha.go 天眼查 MCP 工商信息配置服务(P31 Feature B)。
// 复用 sys_oauth_config 单行存储:provider='tianyancha_mcp',
// app_id=MCP 端点 URL,app_secret=MCP API Key,extra=工具名/参数名映射 JSON
// (不同版本工具名可能不同,做成可配置不硬编码)。
// GET 脱敏(secret 只回 ****+尾4 位),PUT 收到脱敏值保留原值;
// 端点保存时做出网校验(llm.ValidatePublicBaseURL)。
// 写操作挂 system 模块 frozen 组(演示模式冻结)。

// TianyanchaToolMapping extra JSON 的工具名/参数名映射。
// 字段留空表示该步骤跳过(如只配 detail 时直接按名称查详情)。
type TianyanchaToolMapping struct {
	Search      string `json:"search"`        // 搜索工具名(默认 search_companies)
	SearchParam string `json:"search_param"`  // 搜索工具的企业名参数名(默认 query)
	Detail      string `json:"detail"`        // 详情工具名(默认 get_company_basic_profile)
	DetailParam string `json:"detail_param"`  // 详情工具的企业名参数名(默认 company)
}

// DefaultTianyanchaMapping 天眼查个人版 MCP 的默认工具映射(天眼查实际工具名)。
func DefaultTianyanchaMapping() TianyanchaToolMapping {
	return TianyanchaToolMapping{
		Search:      "search_companies",
		SearchParam: "query",
		Detail:      "get_company_basic_profile",
		DetailParam: "company",
	}
}

// Normalize 补齐空字段为默认值,返回可用映射。
func (m TianyanchaToolMapping) Normalize() TianyanchaToolMapping {
	def := DefaultTianyanchaMapping()
	if strings.TrimSpace(m.Search) == "" {
		m.Search = def.Search
	}
	if strings.TrimSpace(m.SearchParam) == "" {
		m.SearchParam = def.SearchParam
	}
	if strings.TrimSpace(m.Detail) == "" {
		m.Detail = def.Detail
	}
	if strings.TrimSpace(m.DetailParam) == "" {
		m.DetailParam = def.DetailParam
	}
	return m
}

// ParseTianyanchaMapping 解析 extra JSON;空/坏 JSON 回落默认映射。
func ParseTianyanchaMapping(extra string) TianyanchaToolMapping {
	var m TianyanchaToolMapping
	if strings.TrimSpace(extra) != "" {
		_ = json.Unmarshal([]byte(extra), &m)
	}
	return m.Normalize()
}

// TianyanchaService 天眼查 MCP 配置服务。
type TianyanchaService struct {
	repo *repository.OauthConfigRepo
}

func NewTianyanchaService() *TianyanchaService {
	return &TianyanchaService{repo: repository.NewOauthConfigRepo()}
}

// TianyanchaConfigView 配置视图(api_key 脱敏)。
type TianyanchaConfigView struct {
	Enabled  int8                   `json:"enabled"`
	Endpoint string                 `json:"endpoint"`          // MCP 端点 URL(存 app_id)
	APIKey   string                 `json:"api_key"`           // 脱敏:****abcd(存 app_secret)
	Tools    TianyanchaToolMapping  `json:"tools"`             // 工具名/参数名映射(extra JSON)
	Remark   string                 `json:"remark"`
}

// SaveTianyanchaConfigRequest 保存请求。api_key 传脱敏值(****开头)→ 保留原值。
type SaveTianyanchaConfigRequest struct {
	Enabled *int8  `json:"enabled"`
	Endpoint string `json:"endpoint"`
	APIKey   string `json:"api_key"`
	Tools    *TianyanchaToolMapping `json:"tools"`
	Remark   string `json:"remark"`
}

// getConfigRow 读单行配置(无则 gorm.ErrRecordNotFound)。
func (s *TianyanchaService) getConfigRow(ctx context.Context) (*model.SysOauthConfig, error) {
	return s.repo.GetByProvider(ctx, model.OAuthProviderTianyanchaMCP)
}

// Get 配置详情(secret 脱敏)。
func (s *TianyanchaService) Get(ctx context.Context) (*TianyanchaConfigView, error) {
	row, err := s.getConfigRow(ctx)
	if repository.IsNotFound(err) {
		// 未配置:返回空视图(前端据此渲染未配置态),不报错。
		return &TianyanchaConfigView{Tools: DefaultTianyanchaMapping()}, nil
	}
	if err != nil {
		return nil, err
	}
	return &TianyanchaConfigView{
		Enabled:  row.Enabled,
		Endpoint: row.AppID,
		APIKey:   MaskSecret(row.AppSecret),
		Tools:    ParseTianyanchaMapping(row.Extra),
		Remark:   row.Remark,
	}, nil
}

// Save 保存(单行 upsert)。endpoint 做出网校验;api_key 脱敏值保留原值。
// 启用时要求 endpoint 与 api_key 都有值。
func (s *TianyanchaService) Save(ctx context.Context, req *SaveTianyanchaConfigRequest) error {
	endpoint := strings.TrimSpace(req.Endpoint)
	if endpoint != "" {
		if err := llm.ValidatePublicBaseURL(endpoint); err != nil {
			return err
		}
	}
	if req.Enabled != nil && *req.Enabled == model.OauthEnabled {
		row, err := s.getConfigRow(ctx)
		existingKey := ""
		if err == nil {
			existingKey = row.AppSecret
		}
		if endpoint == "" && existingKey == "" {
			return errors.New("MCP 端点未填写,无法启用")
		}
		if !isMaskedSecret(req.APIKey) && req.APIKey == "" && existingKey == "" {
			return errors.New("API Key 未填写,无法启用")
		}
	}
	tools := DefaultTianyanchaMapping()
	if req.Tools != nil {
		tools = req.Tools.Normalize()
	}
	extra, _ := json.Marshal(tools)

	row, err := s.getConfigRow(ctx)
	if repository.IsNotFound(err) {
		if endpoint == "" {
			return errors.New("首次保存请填写 MCP 端点 URL")
		}
		if req.APIKey == "" || isMaskedSecret(req.APIKey) {
			return errors.New("首次保存请填写明文 API Key")
		}
		enabled := model.OauthDisabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		cfg := &model.SysOauthConfig{
			Provider:  model.OAuthProviderTianyanchaMCP,
			Name:      "天眼查 MCP 工商信息",
			Enabled:   enabled,
			AppID:     endpoint,
			AppSecret: req.APIKey,
			Extra:     string(extra),
			Remark:    req.Remark,
		}
		return s.repo.Create(ctx, cfg)
	}
	if err != nil {
		return err
	}
	row.AppID = endpoint
	if req.Enabled != nil {
		row.Enabled = *req.Enabled
	}
	if req.Remark != "" || req.Endpoint != "" || req.APIKey != "" || req.Tools != nil {
		row.Remark = req.Remark
	}
	row.Extra = string(extra)
	if !isMaskedSecret(req.APIKey) && req.APIKey != "" {
		row.AppSecret = req.APIKey
	}
	return s.repo.Update(ctx, row)
}

// GetActiveConfig 业务侧(crm)读取可用配置:存在且启用才返回;否则报「天眼查未配置」。
func (s *TianyanchaService) GetActiveConfig(ctx context.Context) (*model.SysOauthConfig, TianyanchaToolMapping, error) {
	row, err := s.getConfigRow(ctx)
	if err != nil {
		return nil, TianyanchaToolMapping{}, errors.New("天眼查未配置,请先在系统管理中配置天眼查 MCP")
	}
	if row.Enabled != model.OauthEnabled {
		return nil, TianyanchaToolMapping{}, errors.New("天眼查未启用,请在系统管理中启用天眼查 MCP 配置")
	}
	return row, ParseTianyanchaMapping(row.Extra), nil
}
