package cms

import "qzt-go-server/internal/model/base"

// push_log.go 搜索引擎推送日志(百度主动推送/IndexNow)。一条 URL 一次调用一行。

// 推送通道。
const (
	PushChannelBaidu    = "baidu"
	PushChannelIndexNow = "indexnow"
)

// 推送状态。
const (
	PushStatusSuccess = "success"
	PushStatusFailed  = "failed"
	PushStatusSkipped = "skipped" // 24h 内已推送过/配额耗尽未推
)

// CmsPushLog 搜索引擎推送日志。
type CmsPushLog struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 通道 baidu/indexnow
	Channel string `json:"channel" gorm:"size:16;not null;index:idx_channel_url,priority:1;comment:通道 baidu/indexnow"`
	// 推送URL
	URL string `json:"url" gorm:"size:500;not null;index:idx_channel_url,priority:2;comment:推送URL"`
	// 关联类型 cms_article/custom
	RefType string `json:"ref_type" gorm:"size:32;default:'';comment:关联类型 cms_article/custom"`
	// 关联ID(0=纯URL)
	RefID uint `json:"ref_id" gorm:"default:0;comment:关联ID"`
	// success/failed/skipped
	Status string `json:"status" gorm:"size:16;not null;comment:success/failed/skipped"`
	// HTTP状态码(0=未发出请求)
	HTTPCode int `json:"http_code" gorm:"default:0;comment:HTTP状态码"`
	// 响应摘要(截断)
	RespBody string `json:"resp_body" gorm:"size:500;default:'';comment:响应摘要(截断)"`
	// 失败/跳过原因
	Error string `json:"error" gorm:"size:500;default:'';comment:失败或跳过原因"`
	// 批次ID(同一次推送操作共享)
	BatchID string `json:"batch_id" gorm:"size:64;index;comment:批次ID"`
	base.BaseModel
}

func (CmsPushLog) TableName() string { return "cms_push_log" }
