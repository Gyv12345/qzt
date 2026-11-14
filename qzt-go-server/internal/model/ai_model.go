package model

import (
	"qzt-go-server/internal/model/base"
)

// AIModel AI 模型档案(sys_ai_model,P30 AI 模型控制台)。
// 多条档案并存,单条 is_default=1 生效(语义同 sys_storage_config 的 is_active);
// 后台「启用」时热切换:app.ReloadLLM 用该档案重建 internal/pkg/llm 默认客户端。
// api_key 落库原文,列表接口脱敏只回 ****+尾4 位。
type AIModel struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 显示名
	Name string `json:"name" gorm:"size:100;not null;comment:显示名"`
	// OpenAI 兼容端点根地址(如 https://api.deepseek.com)
	BaseURL string `json:"base_url" gorm:"size:255;not null;comment:OpenAI兼容端点根地址"`
	// 供应商 API Key(列表脱敏只回尾4位)
	APIKey string `json:"-" gorm:"size:255;not null;comment:供应商API Key(列表脱敏只回尾4位)"`
	// 模型标识(如 deepseek-chat/qwen-plus)
	Model string `json:"model" gorm:"size:100;not null;comment:模型标识(如deepseek-chat)"`
	// 是否当前生效(全表仅一条为1)
	IsDefault int8 `json:"is_default" gorm:"not null;default:0;comment:是否当前生效(全表仅一条为1)"`
	// 是否启用(0=停用档案不可激活)
	Enabled int8 `json:"enabled" gorm:"not null;default:1;comment:是否启用(0=停用档案不可激活)"`
	// 备注
	Remark string `json:"remark" gorm:"size:255;not null;default:'';comment:备注"`

	base.BaseModel
}

func (AIModel) TableName() string { return "ai_model" }
