package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// message.go OA 站内信(oa_message)。
// 用户互发(Markdown+附件) + 系统消息(senderId=0),未读计数,SSE 实时推送。

const (
	MsgUnread int8 = 0 // 未读
	MsgRead   int8 = 1 // 已读
)

const SystemSenderID uint = 0

// OaMessage 站内信。
type OaMessage struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	// 发送人ID(系统消息=0)
	SenderID    uint           `json:"sender_id" gorm:"index;comment:发送人ID(系统消息=0)"`
	// 接收人ID
	ReceiverID  uint           `json:"receiver_id" gorm:"index;comment:接收人ID"`
	// 标题
	Title       string         `json:"title" gorm:"size:200;not null;comment:标题"`
	// 内容
	Content     string         `json:"content" gorm:"type:text;comment:内容"`
	// 内容格式(text/markdown)
	ContentType string         `json:"content_type" gorm:"size:20;default:text;comment:内容格式(text/markdown)"`
	// 是否已读(0未读 1已读)
	IsRead      int8           `json:"is_read" gorm:"default:0;index;comment:是否已读(0未读 1已读)"`
	// 阅读时间
	ReadTime    xtime.DateTime `json:"read_time" gorm:"type:datetime;comment:阅读时间"`
	base.BaseModel
}

func (OaMessage) TableName() string { return "oa_message" }
