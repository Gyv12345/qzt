package ai

import "qzt-go-server/pkg/xtime"

// ai_tool_call_log.go AI 对话工具调用审计日志(P34 悬浮球 tool use)。
// 每次 AI 对话中的工具执行落一条:谁在何时让 AI 调了什么工具、入参/结果摘要、
// 成败与耗时。失败也落(OK=0,ErrMsg 摘要)。写失败仅记日志不阻断对话。

// AiToolCallLog AI 对话工具调用审计记录。
type AiToolCallLog struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 发起对话的用户
	UserID uint `json:"user_id" gorm:"index;comment:发起对话的用户ID"`
	// 工具名
	Tool string `json:"tool" gorm:"size:100;not null;comment:工具名"`
	// 入参 JSON 摘要(截 120 字节)
	ArgsSummary string `json:"args_summary" gorm:"size:200;comment:入参JSON摘要"`
	// 结果摘要(截 200 字节)
	ResultSummary string `json:"result_summary" gorm:"size:300;comment:结果摘要"`
	// 成功 1 失败 0
	OK int8 `json:"ok" gorm:"comment:成功1失败0"`
	// 耗时毫秒
	Ms int64 `json:"ms" gorm:"comment:耗时毫秒"`
	// 来源场景(float_chat=悬浮球/大页对话)
	Scene string `json:"scene" gorm:"size:32;comment:来源场景(float_chat)"`
	// 创建时间
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
}

func (AiToolCallLog) TableName() string { return "ai_tool_call_log" }
