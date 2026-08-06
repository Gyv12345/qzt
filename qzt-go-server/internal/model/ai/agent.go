package ai

// agent.go AI Agent 数据模型。

import (
	"qzt-go-server/internal/model/base"
)

// Agent 场景常量。
const (
	SceneScript = "script" // 回访话术
	SceneFollow = "follow" // 跟进记录
	SceneReport = "report" // 日报周报
)

// AiAgent AI Agent 定义。
type AiAgent struct {
	ID           uint    `json:"id" gorm:"primaryKey"`
	Name         string  `json:"name" gorm:"size:100;not null;comment:Agent名称"`
	Code         string  `json:"code" gorm:"size:64;uniqueIndex;not null;comment:Agent编码"`
	Scene        string  `json:"scene" gorm:"size:32;index;not null;comment:场景"`
	SystemPrompt string  `json:"system_prompt" gorm:"type:text;not null;comment:系统提示词"`
	UserPrompt   string  `json:"user_prompt" gorm:"type:text;comment:用户提示词模板"`
	Model        *string `json:"model" gorm:"size:64;comment:指定模型"`
	Temperature  *float64 `json:"temperature" gorm:"comment:温度"`
	Status       int8    `json:"status" gorm:"default:1;comment:1启用 0停用"`
	Sort         int     `json:"sort" gorm:"default:0"`
	base.BaseModel
}

func (AiAgent) TableName() string { return "ai_agent" }
