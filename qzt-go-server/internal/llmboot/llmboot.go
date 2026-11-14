// Package llmboot LLM 网关装配(启动初始化 + 后台热切换)。
// P30 AI 模型控制台:ai_model 表单条 is_default=1 生效(语义同 sys_storage_config),
// InitLLM 启动时优先读生效档案;表为空从 config.LLM(yaml+.env 的 LLM_API_KEY)播种
// 「初始配置(env 播种)」;无生效行/DB 异常回落 env 配置并告警,不阻断启动。
//
// 不放 internal/app 的原因:internal/pkg/llm 引用 internal/repository(记账),
// 而 repository 反向依赖 app(取全局 DB)——app→llm 会成环。本包是接线层
// (同 internal/mcp 模式),允许同时引用 app/llm/repository 而无环。
package llmboot

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/repository"
)

// seedAIModelID env 播种行的固定主键(与 docs/sql/ai_agent.sql 建表配套,
// 表为空时才插入,ON DUPLICATE 幂等;后台后续管理的档案不受影响)。
const seedAIModelID = 1

// repo AI 模型档案 repository(包级单例,无状态)。
var repo = repository.NewAIModelRepo()

// InitLLM 初始化统一 LLM 网关(main.go 启动时调用一次,需在 InitDatabase 之后)。
// 顺序:读 ai_model 生效档案 → 表为空则从 env 播种一行 → llm.Init 装配。
// 任何 DB 异常/档案异常一律回落 env 配置(Chat 未配置时返回 ErrNotConfigured,
// 业务侧走降级文案),不阻断启动。
func InitLLM() {
	ctx := context.Background()
	profile, name, err := loadDefaultAIModel(ctx)
	switch {
	case err == nil:
		// DB 档案出网校验失败按未生效处理,回落 env(档案被手改坏的情形)。
		if verr := llm.ValidatePublicBaseURL(profile.BaseURL); verr != nil {
			app.Log.Warnf("AI 模型生效档案 base_url 校验失败(%v),本次回落 env 配置", verr)
			initLLMFromEnv()
			return
		}
		llm.Init(BuildLLMOptionsFromProfile(profile))
		app.Log.Infof("LLM 网关已初始化: source=db:%s model=%s", name, profile.Model)
	case errors.Is(err, gorm.ErrRecordNotFound):
		total, cntErr := repo.CountAll(ctx)
		if cntErr != nil {
			app.Log.Warnf("count ai_model failed(%v),LLM 回落 env 配置", cntErr)
			initLLMFromEnv()
			return
		}
		if total == 0 {
			seeded, seedErr := seedFromEnv(ctx)
			if seedErr != nil {
				app.Log.Warnf("seed ai_model from env failed(%v),LLM 回落 env 配置", seedErr)
				initLLMFromEnv()
				return
			}
			llm.Init(BuildLLMOptionsFromProfile(seeded))
			app.Log.Infof("LLM 网关已初始化: source=env-seed model=%s", seeded.Model)
			return
		}
		// 有档案但无生效行:属后台数据异常,不静默改数据,回落 env 并告警。
		app.Log.Warnf("ai_model 存在 %d 条档案但无生效行(is_default=1),本次回落 env 配置;请在后台「AI 模型」启用一条", total)
		initLLMFromEnv()
	default:
		app.Log.Warnf("load default ai_model failed(%v),LLM 回落 env 配置", err)
		initLLMFromEnv()
	}
}

// loadDefaultAIModel 读当前生效档案(is_default=1,软删除自动过滤)。
func loadDefaultAIModel(ctx context.Context) (*model.AIModel, string, error) {
	row, err := repo.GetDefault(ctx)
	if err != nil {
		return nil, "", err
	}
	return row, row.Name, nil
}

// seedFromEnv 把 config.LLM(yaml+.env 的 LLM_API_KEY)播种为 ai_model 首条生效档案,
// 幂等:固定 ID + ON DUPLICATE DO NOTHING。仅表空时由 InitLLM 调用。
func seedFromEnv(ctx context.Context) (*model.AIModel, error) {
	cfg := config.Get().LLM
	seed := &model.AIModel{
		ID:        seedAIModelID,
		Name:      "初始配置(env 播种)",
		BaseURL:   cfg.BaseURL,
		APIKey:    cfg.APIKey,
		Model:     cfg.Model,
		IsDefault: 1,
		Enabled:   1,
		Remark:    "首次启动由 LLM_API_KEY 环境配置自动播种,可在后台修改",
	}
	if err := app.DB.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.Assignments(map[string]any{"id": gorm.Expr("id")}),
	}).Create(seed).Error; err != nil {
		return nil, err
	}
	return seed, nil
}

// initLLMFromEnv 按 env/yaml 配置装配(启动兜底路径,与 P26 之前的行为一致)。
func initLLMFromEnv() {
	llm.Init(llm.OptionsFromConfig(config.Get().LLM))
	app.Log.Infof("LLM 网关已初始化: source=env model=%s", config.Get().LLM.Model)
}

// BuildLLMOptionsFromProfile 按 ai_model 档案行装配 llm.Options。
// 超时/重试/限流/缓存沿用 config.LLM 的全局运行参数(档案只负责供应商三元组)。
func BuildLLMOptionsFromProfile(p *model.AIModel) llm.Options {
	cfg := config.Get().LLM
	return llm.Options{
		BaseURL:    p.BaseURL,
		APIKey:     p.APIKey,
		Model:      p.Model,
		Timeout:    cfg.Timeout,
		MaxRetries: cfg.MaxRetries,
		RPM:        cfg.RPM,
		CacheTTL:   cfg.CacheTTL,
	}
}

// ReloadLLM 热切换全局 LLM 客户端(后台「启用」新档案且 DB 事务提交成功后调用)。
// llm.Init 为包级单例且自带互斥(Init 持锁整体替换 gw,Default 走读锁),并发安全;
// 调用方需先校验 base_url(llm.ValidatePublicBaseURL),此处不再重复校验。
func ReloadLLM(p *model.AIModel) {
	llm.Init(BuildLLMOptionsFromProfile(p))
	app.Log.Infof("LLM 网关已热切换,新档案即时生效: %s(model=%s)", p.Name, p.Model)
}
