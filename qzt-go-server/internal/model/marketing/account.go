// Package marketing 营销模块模型(渠道账号 + 线索同步日志)。
package marketing

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// account.go 营销渠道账号(marketing_account)。
//
// 每客户一条:巨量引擎开放平台应用(app_id/app_secret) + OAuth 授权换来的
// access/refresh token + 已授权广告主列表 + 线索同步游标(last_sync_at)。
// sys_oauth_config 按 provider 唯一装不下「每客户一条账号」,故独立建表。

// 渠道。
const (
	ChannelOceanEngine = "oceanengine" // 巨量引擎(抖音广告)
)

// 授权状态。
const (
	AccountStatusPending int8 = 0 // 待授权(已填 app_id/secret,未走 OAuth)
	AccountStatusAuthed  int8 = 1 // 已授权
	AccountStatusExpired int8 = 2 // 授权失效(refresh_token 过期或刷新被拒,需重新授权)
)

// MarketingAccount 营销渠道账号。
type MarketingAccount struct {
	ID      uint   `json:"id" gorm:"primaryKey"`
	Name    string `json:"name" gorm:"size:100;not null;comment:账号备注名"`
	Channel string `json:"channel" gorm:"size:32;not null;default:oceanengine;comment:渠道(oceanengine巨量引擎)"`
	AppID   string `json:"app_id" gorm:"size:64;not null;comment:开放平台应用ID"`
	// 应用Secret(脱敏,不返回)
	AppSecret string `json:"-" gorm:"size:128;comment:应用Secret(脱敏,不返回)"`
	// 访问令牌(约24h,脱敏不返回)
	AccessToken string `json:"-" gorm:"size:512;comment:访问令牌(脱敏,不返回)"`
	// 刷新令牌(约30d,脱敏不返回)
	RefreshToken string `json:"-" gorm:"size:512;comment:刷新令牌(脱敏,不返回)"`
	// access_token 过期时间
	TokenExpiresAt *xtime.DateTime `json:"token_expires_at" gorm:"comment:access_token过期时间"`
	// refresh_token 过期时间
	RefreshExpiresAt *xtime.DateTime `json:"refresh_expires_at" gorm:"comment:refresh_token过期时间"`
	// 已授权广告主ID(逗号分隔)
	AdvertiserIDs string `json:"advertiser_ids" gorm:"size:512;comment:已授权广告主ID(逗号分隔)"`
	// 授权状态(0待授权 1已授权 2授权失效)
	Status int8 `json:"status" gorm:"default:0;index:idx_marketing_account_status,priority:1;comment:授权状态"`
	// 是否启用(停用后定时任务跳过)
	Enabled int8 `json:"enabled" gorm:"default:1;index:idx_marketing_account_status,priority:2;comment:是否启用"`
	// 上次线索同步游标时间
	LastSyncAt *xtime.DateTime `json:"last_sync_at" gorm:"comment:上次线索同步游标时间"`
	base.BaseModel
}

func (MarketingAccount) TableName() string { return "marketing_account" }
