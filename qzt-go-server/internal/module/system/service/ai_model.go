package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"qzt-go-server/config"
	"qzt-go-server/internal/llmboot"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/repository"
)

// ai_model.go AI 模型档案服务(系统管理-AI 助手「AI 模型」页,P30)。
// ai_model:多条档案并存,单条 is_default=1 生效(语义同 sys_storage_config);
// 「启用」= 事务内清全表 is_default → 置该行 → 出网校验通过才提交,
// 提交后 llmboot.ReloadLLM 热切换,下一次 llm.Chat 即刻走新供应商。
// api_key 列表脱敏只回 ****+尾4 位;保存收到脱敏值(****开头)保留原值不覆盖。
// 安全:保存/激活前对 base_url 做出网校验(llm.ValidatePublicBaseURL)——
// 仅 http/https 且 host 非环回/内网/保留地址,防止把含业务数据的提示词引到内网端点。
// 写操作(保存/删除/启用)在演示模式下被 DemoSystemWriteGuard 冻结(路由层已挂):
// 模型切换绝不能被演示访客操作。

// AIModelService AI 模型档案服务。
type AIModelService struct {
	repo *repository.AIModelRepo
}

func NewAIModelService() *AIModelService {
	return &AIModelService{repo: repository.NewAIModelRepo()}
}

// AIModelItem 列表行(api_key 脱敏)。
type AIModelItem struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	BaseURL   string    `json:"base_url"`
	APIKey    string    `json:"api_key"` // 脱敏:****abcd
	Model     string    `json:"model"`
	IsDefault int8      `json:"is_default"`
	Enabled   int8      `json:"enabled"`
	Remark    string    `json:"remark"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SaveAIModelRequest 保存(新建/更新)请求。api_key 传脱敏值(****开头)→ 保留原值。
type SaveAIModelRequest struct {
	Name    string `json:"name" binding:"required"`
	BaseURL string `json:"base_url" binding:"required"`
	APIKey  string `json:"api_key"`
	Model   string `json:"model" binding:"required"`
	Enabled *int8  `json:"enabled"`
	Remark  string `json:"remark"`
}

// toModelItem 档案行 → 脱敏列表项。
func toModelItem(p *model.AIModel) *AIModelItem {
	return &AIModelItem{
		ID:        p.ID,
		Name:      p.Name,
		BaseURL:   p.BaseURL,
		APIKey:    MaskSecret(p.APIKey),
		Model:     p.Model,
		IsDefault: p.IsDefault,
		Enabled:   p.Enabled,
		Remark:    p.Remark,
		CreatedAt: p.CreatedAt.Time(),
		UpdatedAt: p.UpdatedAt.Time(),
	}
}

// CurrentAIModel 当前生效档案(含来源 db/env)。env 来源回传 config.LLM 三元组(key 脱敏)。
type CurrentAIModel struct {
	Source  string `json:"source"` // db / env
	ID      uint   `json:"id"`     // db 来源的档案 ID;env 来源为 0
	Name    string `json:"name"`
	BaseURL string `json:"base_url"`
	APIKey  string `json:"api_key"` // 脱敏:****abcd
	Model   string `json:"model"`
}

// List 档案列表(生效行置顶,api_key 脱敏)。
func (s *AIModelService) List(ctx context.Context) ([]*AIModelItem, error) {
	list, err := s.repo.List(ctx, &repository.QueryOptions{Order: []string{"is_default DESC", "id ASC"}})
	if err != nil {
		return nil, err
	}
	out := make([]*AIModelItem, 0, len(list))
	for i := range list {
		out = append(out, toModelItem(&list[i]))
	}
	return out, nil
}

// Create 新建档案(不自动激活,由「启用」显式切换)。api_key 必填(无原值可保留);
// 新建时传脱敏值(****开头)无原值可回填,显式拒绝,防止把掩码串存进库。
func (s *AIModelService) Create(ctx context.Context, req *SaveAIModelRequest) (*AIModelItem, error) {
	if err := validateAIModelRequest(req, true); err != nil {
		return nil, err
	}
	if isMaskedSecret(req.APIKey) {
		return nil, errors.New("新建档案请输入明文 api_key(脱敏值仅更新时用于保留原值)")
	}
	enabled := int8(1)
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	p := &model.AIModel{
		Name:      strings.TrimSpace(req.Name),
		BaseURL:   strings.TrimSpace(req.BaseURL),
		APIKey:    req.APIKey,
		Model:     strings.TrimSpace(req.Model),
		IsDefault: 0,
		Enabled:   enabled,
		Remark:    req.Remark,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return toModelItem(p), nil
}

// Update 更新档案。api_key 传脱敏值(****开头)保留原值不覆盖;不改动 is_default。
func (s *AIModelService) Update(ctx context.Context, id uint, req *SaveAIModelRequest) error {
	if err := validateAIModelRequest(req, false); err != nil {
		return err
	}
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "档案不存在")
	}
	p.Name = strings.TrimSpace(req.Name)
	p.BaseURL = strings.TrimSpace(req.BaseURL)
	p.Model = strings.TrimSpace(req.Model)
	p.Remark = req.Remark
	if req.Enabled != nil {
		p.Enabled = *req.Enabled
	}
	fields := []string{"Name", "BaseURL", "Model", "Remark", "Enabled"}
	// api_key:脱敏值(****开头)保留原值,明文值才覆盖(与存储配置密钥口径对齐)
	if !isMaskedSecret(req.APIKey) && req.APIKey != "" {
		p.APIKey = req.APIKey
		fields = append(fields, "APIKey")
	}
	return s.repo.Update(ctx, p, fields...)
}

// Delete 删除档案。当前生效(is_default=1)的档案拒绝删除——删除会使运行中的 LLM 失去档案来源。
func (s *AIModelService) Delete(ctx context.Context, id uint) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "档案不存在")
	}
	if p.IsDefault == 1 {
		return errors.New("当前生效的 AI 模型档案不允许删除,请先启用其他档案")
	}
	return s.repo.Delete(ctx, id)
}

// Activate 启用档案(热切换):事务内「清全表 is_default → 置该行」,
// 出网校验通过才提交(失败回滚生效标记并报错);提交成功后 ReloadLLM 即刻生效。
func (s *AIModelService) Activate(ctx context.Context, id uint) error {
	var profile *model.AIModel
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		p, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return repository.NotFoundOr(err, "档案不存在")
		}
		if p.Enabled != 1 {
			return errors.New("已停用的档案不可启用,请先修改启用状态")
		}
		if verr := llm.ValidatePublicBaseURL(p.BaseURL); verr != nil {
			return verr
		}
		profile = p
		if err := s.repo.ClearDefault(ctx); err != nil {
			return err
		}
		return s.repo.SetDefault(ctx, id)
	})
	if err != nil {
		return err
	}
	llmboot.ReloadLLM(profile)
	return nil
}

// Current 当前生效档案及来源:DB 有 is_default=1 → db;否则回落 env 配置。
func (s *AIModelService) Current(ctx context.Context) (*CurrentAIModel, error) {
	p, err := s.repo.GetDefault(ctx)
	switch {
	case err == nil:
		return &CurrentAIModel{
			Source:  "db",
			ID:      p.ID,
			Name:    p.Name,
			BaseURL: p.BaseURL,
			APIKey:  MaskSecret(p.APIKey),
			Model:   p.Model,
		}, nil
	case repository.IsNotFound(err):
		return envCurrent(), nil
	default:
		return nil, err
	}
}

// envCurrent env 兜底档案视图(config.LLM,api_key 脱敏)。
func envCurrent() *CurrentAIModel {
	cfg := config.Get().LLM
	return &CurrentAIModel{
		Source:  "env",
		Name:    "环境配置(LLM_API_KEY)",
		BaseURL: cfg.BaseURL,
		APIKey:  MaskSecret(cfg.APIKey),
		Model:   cfg.Model,
	}
}

// ── 校验纯函数 ──

// validateAIModelRequest 保存请求校验。requireKey=新建时 api_key 必填(无原值可保留);
// base_url 出网校验(llm.ValidatePublicBaseURL)两端点共用。
func validateAIModelRequest(req *SaveAIModelRequest, requireKey bool) error {
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("档案名称不能为空")
	}
	if strings.TrimSpace(req.Model) == "" {
		return errors.New("模型标识不能为空")
	}
	if strings.TrimSpace(req.BaseURL) == "" {
		return errors.New("base_url 不能为空")
	}
	if err := llm.ValidatePublicBaseURL(req.BaseURL); err != nil {
		return err
	}
	if requireKey && !isMaskedSecret(req.APIKey) && strings.TrimSpace(req.APIKey) == "" {
		return errors.New("api_key 不能为空")
	}
	return nil
}
