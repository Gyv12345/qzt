package model

import (
	"qzt-go-server/pkg/xtime"
)

// SysLLMUsage LLM 网关调用记账（按用户+功能维度），为 AI 功能的商业化计费预留。
// 纯日志表：只插入不更新/不软删，由 internal/pkg/llm 网关在每次调用后写入；
// 表结构见 docs/sql/llm_usage.sql（应用不做 AutoMigrate）。
type SysLLMUsage struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 发起用户 ID，0 表示系统定时任务
	UserID uint `json:"user_id" gorm:"comment:发起用户ID(0=系统定时任务)"`
	// 功能标识，如 geo.monitor / assessment.report
	Feature          string         `json:"feature" gorm:"size:64;comment:功能标识,如 geo.monitor"`
	Provider         string         `json:"provider" gorm:"size:32;comment:供应商标识"`
	Model            string         `json:"model" gorm:"size:64;comment:模型名"`
	PromptTokens     int            `json:"prompt_tokens" gorm:"comment:输入token数"`
	CompletionTokens int            `json:"completion_tokens" gorm:"comment:输出token数"`
	TotalTokens      int            `json:"total_tokens" gorm:"comment:总token数"`
	FromCache        bool           `json:"from_cache" gorm:"comment:是否命中响应缓存(未消耗供应商额度)"`
	LatencyMs        int64          `json:"latency_ms" gorm:"comment:调用耗时(毫秒)"`
	Status           string         `json:"status" gorm:"size:16;comment:ok/error"`
	// 失败原因摘要（截断，不含 prompt 明文）
	ErrMsg    string         `json:"err_msg" gorm:"size:255;comment:失败原因摘要(不含prompt)"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
}

func (SysLLMUsage) TableName() string {
	return "sys_llm_usage"
}
