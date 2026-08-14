package model

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// api_key.go 用户 API Key(供 CLI / 第三方调用)。
// Key 明文格式: qzt_<32位随机hex>,仅创建时展示一次,DB 存 SHA256 hash。
// 认证时按 hash 查找,写入与 JWT 相同的 context key,Casbin/handler 零改动。

// API Key 状态。
const (
	ApiKeyStatusDisabled int8 = 0 // 禁用
	ApiKeyStatusEnabled  int8 = 1 // 启用
)

// API Key 前缀(用于区分 JWT Token 和 API Key)。
const ApiKeyPrefix = "qzt_"

// SysApiKey 用户 API Key。
type SysApiKey struct {
	ID         uint            `json:"id" gorm:"primaryKey"`
	// 关联用户ID
	UserID     uint            `json:"user_id" gorm:"index;not null;comment:关联用户ID"`
	// Key名称(如'我的CLI')
	Name       string          `json:"name" gorm:"size:128;not null;comment:Key名称(如'我的CLI')"`
	// 前缀(qzt_)
	KeyPrefix  string          `json:"key_prefix" gorm:"size:10;comment:前缀(qzt_)"`
	// SHA256 hash
	KeyHash    string          `json:"-" gorm:"size:64;uniqueIndex;not null;comment:SHA256 hash"`
	// 最后使用时间
	LastUsedAt xtime.NullDateTime `json:"last_used_at" gorm:"type:datetime;comment:最后使用时间"`
	// 最后使用IP
	LastUsedIP string          `json:"last_used_ip" gorm:"size:45;comment:最后使用IP"`
	// 过期时间(空=永不过期)
	ExpiresAt  xtime.NullDateTime `json:"expires_at" gorm:"type:datetime;comment:过期时间(空=永不过期)"`
	// 1启用0禁用
	Status     int8            `json:"status" gorm:"default:1;index;comment:1启用0禁用"`
	base.BaseModel
}

func (SysApiKey) TableName() string { return "sys_api_key" }
