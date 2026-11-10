// Package open 开放集成模块模型(出站 Webhook)。
package open

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// WebhookStatus webhook 启停状态。
const (
	WebhookStatusDisabled int8 = 0
	WebhookStatusEnabled  int8 = 1
)

// 投递状态(open_webhook_event.status)。
const (
	EventStatusPending     int8 = 0 // 待投递
	EventStatusSuccess     int8 = 1 // 已成功
	EventStatusFailed      int8 = 2 // 失败待重试
	EventStatusDead        int8 = 3 // 死信(超过最大重试)
	EventStatusDispatching int8 = 4 // 投递中(投递器乐观锁标记)
)

// OpenWebhook 出站 webhook 端点配置。
type OpenWebhook struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name" gorm:"size:128;not null;comment:端点名称"`
	// 投递目标 URL(仅 http/https)
	URL string `json:"url" gorm:"size:512;not null;comment:投递目标URL"`
	// HMAC-SHA256 签名密钥(敏感,列表响应不返回)
	Secret string `json:"-" gorm:"size:64;not null;comment:签名密钥(脱敏不返回)"`
	// 订阅事件(逗号分隔,空=全部)
	Events string `json:"events" gorm:"size:255;not null;default:;comment:订阅事件,逗号分隔,空=全部"`
	// 1启用 0停用
	Status int8 `json:"status" gorm:"default:1;comment:1启用0停用"`
	// 备注
	Remark string `json:"remark" gorm:"size:255;comment:备注"`
	// 创建人
	CreatedBy uint `json:"created_by" gorm:"comment:创建人"`
	base.BaseModel
}

func (OpenWebhook) TableName() string { return "open_webhook" }

// OpenWebhookEvent 事件投递日志(outbox,追加写;成功日志由 cleanup job 定期硬删)。
type OpenWebhookEvent struct {
	ID        uint `json:"id" gorm:"primaryKey"`
	WebhookID uint `json:"webhook_id" gorm:"not null;comment:目标webhook"`
	// 事件类型(见 open 模块事件目录)
	EventType string `json:"event_type" gorm:"size:64;not null;comment:事件类型"`
	// 事件载荷 JSON 快照
	Payload string `json:"payload" gorm:"type:text;comment:事件载荷JSON快照"`
	// 0待投递 1成功 2失败重试中 3死信 4投递中
	Status int8 `json:"status" gorm:"default:0;comment:0待投递1成功2失败重试中3死信4投递中"`
	// 已尝试次数
	RetryCount int `json:"retry_count" gorm:"default:0;comment:已尝试次数"`
	// 最大尝试次数
	MaxRetries int `json:"max_retries" gorm:"default:5;comment:最大尝试次数"`
	// 下次投递时间
	NextRetryAt *xtime.DateTime `json:"next_retry_at" gorm:"comment:下次投递时间"`
	// 最近一次 HTTP 状态码
	LastHTTPStatus int `json:"last_http_status" gorm:"comment:最近一次HTTP状态码"`
	// 最近一次错误
	LastError string `json:"last_error" gorm:"size:512;comment:最近一次错误"`
	// 投递成功时间
	DeliveredAt *xtime.DateTime `json:"delivered_at" gorm:"comment:投递成功时间"`
	base.BaseModel
}

func (OpenWebhookEvent) TableName() string { return "open_webhook_event" }
