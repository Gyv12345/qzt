package model

// oauth_config.go 第三方登录配置(sys_oauth_config)。
// 独立于 sys_config,有专门的管理页面。支持企业微信/钉钉/飞书等多渠道。
// 每条记录 = 一个渠道的完整配置(corp_id/secret/redirect_uri 等),按 provider 唯一。

// 第三方登录渠道。
const (
	OAuthProviderWecom  = "wecom"  // 企业微信
	OAuthProviderDing   = "ding"   // 钉钉(预留)
	OAuthProviderFeishu = "feishu" // 飞书(预留)
)

// SysOauthConfig 第三方登录配置。
// credentials 存敏感信息(secret),JSON 格式,响应时脱敏。
type SysOauthConfig struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	// 渠道(wecom/ding/feishu)
	Provider string `json:"provider" gorm:"size:32;uniqueIndex;not null;comment:渠道(wecom/ding/feishu)"`
	// 显示名称(如'企业微信扫码登录')
	Name     string `json:"name" gorm:"size:100;comment:显示名称(如'企业微信扫码登录')"`
	// 是否启用(1启用0禁用)
	Enabled  int8   `json:"enabled" gorm:"default:0;index;comment:是否启用(1启用0禁用)"`
	// 渠道公共字段(企业微信: corp_id=AppID; 钉钉: app_key)
	AppID       string `json:"app_id" gorm:"size:128;comment:应用ID(corp_id/app_key)"`
	// 应用Secret(脱敏,不返回)
	AppSecret   string `json:"-" gorm:"size:256;comment:应用Secret(脱敏,不返回)"`
	// AgentID(企业微信用)
	AgentID     string `json:"agent_id" gorm:"size:64;comment:AgentID(企业微信用)"`
	// 扫码登录回调地址
	RedirectURI string `json:"redirect_uri" gorm:"size:500;comment:扫码登录回调地址"`
	// 额外配置(JSON,不同渠道的扩展字段,如企业微信的可信域名)
	Extra  string `json:"extra" gorm:"type:text;comment:扩展配置JSON"`
	Sort   int    `json:"sort" gorm:"default:0"`
	Remark string `json:"remark" gorm:"size:255"`
	BaseModel
}

func (SysOauthConfig) TableName() string { return "sys_oauth_config" }

// OauthEnabled / OauthDisabled 配置启停常量。
const (
	OauthDisabled int8 = 0
	OauthEnabled  int8 = 1
)
