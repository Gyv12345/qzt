// Package im 即时通讯(IM)模型。
// 三张表:im_conversation(会话) / im_conversation_member(会话成员) / im_message(消息)。
// 单聊幂等键 conv_key="min_max"(如 "1_5"),唯一索引;群聊 conv_key 存 NULL
// (MySQL 唯一索引允许多个 NULL,群聊靠应用层无幂等需求)。
package im

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// 会话类型。
const (
	ConvTypeSingle string = "single"
	ConvTypeGroup  string = "group"
)

// 消息内容类型(v1 仅支持 text)。
const MsgTypeText string = "text"

// IMConversation IM 会话。
type IMConversation struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 会话类型(single/group)
	Type string `json:"type" gorm:"size:16;not null;index;comment:会话类型(single/group)"`
	// 会话名称(群名;单聊为空,前端按对端昵称展示)
	Name string `json:"name" gorm:"size:64;default:'';comment:会话名称(群名)"`
	// 所有者用户ID(单聊=发起人,群聊=创建人)
	OwnerID uint `json:"owner_id" gorm:"index;comment:所有者用户ID(创建人)"`
	// 会话幂等键:单聊="min_max" 双方用户ID;群聊=NULL(唯一索引对 NULL 不去重)
	ConvKey *string `json:"-" gorm:"size:64;uniqueIndex:uk_conv_key;comment:会话幂等键(single=min_max,group=NULL)"`
	// 最新消息ID(列表冗余展示)
	LastMessageID uint `json:"last_message_id" gorm:"default:0;comment:最新消息ID"`
	// 最新消息时间(会话列表排序字段;无消息时为 NULL/零值排在最后)
	LastMessageAt xtime.DateTime `json:"last_message_at" gorm:"type:datetime;comment:最新消息时间"`
	base.BaseModel
}

func (IMConversation) TableName() string { return "im_conversation" }

// IMConversationMember IM 会话成员。
//
// 注意:成员行在退出/移除时**硬删除**(而非软删除)——软删除行仍占用
// (conversation_id,user_id) 唯一索引,会导致同一用户被移除后无法重新加入。
// 成员行业务价值低(仅游标+归属),硬删最简单且唯一索引保持安全。
type IMConversationMember struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 会话ID
	ConversationID uint `json:"conversation_id" gorm:"uniqueIndex:uk_conv_member,priority:1;index;comment:会话ID"`
	// 成员用户ID
	UserID uint `json:"user_id" gorm:"uniqueIndex:uk_conv_member,priority:2;index;comment:成员用户ID"`
	// 已读游标:该会话已读到的最大消息ID(未读数 = 大于该游标且非本人发送的消息数)
	LastReadMessageID uint `json:"last_read_message_id" gorm:"default:0;comment:已读游标(已读到的最大消息ID)"`
	base.BaseModel
}

func (IMConversationMember) TableName() string { return "im_conversation_member" }

// IMMessage IM 消息。
type IMMessage struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 会话ID
	ConversationID uint `json:"conversation_id" gorm:"index:idx_im_message_conv;comment:会话ID"`
	// 发送人ID
	SenderID uint `json:"sender_id" gorm:"index;comment:发送人用户ID"`
	// 内容类型(v1 仅 text)
	ContentType string `json:"content_type" gorm:"size:16;default:text;comment:内容类型(v1仅text)"`
	// 消息内容
	Content string `json:"content" gorm:"type:text;comment:消息内容"`
	base.BaseModel
}

func (IMMessage) TableName() string { return "im_message" }
