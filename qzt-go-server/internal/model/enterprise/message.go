package enterprise

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// message.go 站内信(sys_message)。
// 用户互发 + 系统消息(senderId=0),未读计数,标记已读。

// 消息已读状态。
const (
	MsgUnread int8 = 0 // 未读
	MsgRead   int8 = 1 // 已读
)

// 系统消息发送人 ID(固定 0,表示无具体发送人,由系统/定时任务发出)。
const SystemSenderID uint = 0

// SysMessage 站内信。
type SysMessage struct {
	ID         uint            `json:"id" gorm:"primaryKey"`
	SenderID   uint            `json:"sender_id" gorm:"index;comment:发送人ID(系统消息=0)"`
	ReceiverID uint            `json:"receiver_id" gorm:"index;comment:接收人ID"`
	Title      string          `json:"title" gorm:"size:200;not null;comment:标题"`
	Content    string          `json:"content" gorm:"type:text;comment:内容"`
	IsRead     int8            `json:"is_read" gorm:"default:0;index;comment:是否已读(0未读 1已读)"`
	ReadTime   xtime.DateTime  `json:"read_time" gorm:"type:datetime;comment:阅读时间"`
	base.BaseModel
}

func (SysMessage) TableName() string { return "sys_message" }
