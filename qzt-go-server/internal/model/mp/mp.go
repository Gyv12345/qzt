package mp

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// mp.go 公众号运营中心数据模型(P35,docs/sql/mp_ops.sql 建表)。
// mp_account 支持订阅号+服务号多号并存,wxmp.Client 按 secret 哈希隔离 token 缓存;
// mp_article 是创作工作台的草稿稿本,推送终点是微信草稿箱(发布仍在 mp 后台人工点)。

// Account 公众号账号(mp_account)。
type Account struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 账号名(如 行简订阅号)
	Name string `json:"name" gorm:"size:100;not null;comment:账号名"`
	// 类型:sub=订阅号,srv=服务号
	AccountType string `json:"account_type" gorm:"size:10;not null;default:'sub';comment:类型"`
	// AppID
	AppID string `json:"app_id" gorm:"size:64;not null;default:'';comment:AppID"`
	// AppSecret(明文落库,接口层脱敏只回 ****+尾4)
	AppSecret string `json:"-" gorm:"type:text;not null;comment:AppSecret"`
	// 扩展配置 JSON(预留:thumb_media_id 等)
	Extra string `json:"extra" gorm:"type:text;comment:扩展配置JSON"`
	// 是否启用
	Enabled int8 `json:"enabled" gorm:"not null;default:1;comment:是否启用"`

	base.BaseModel
}

func (Account) TableName() string { return "mp_account" }

// Article 公众号文章草稿(mp_article)。
type Article struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 所属公众号账号
	AccountID uint `json:"account_id" gorm:"not null;comment:所属公众号账号"`
	// 文章标题(微信限 64 字)
	Title string `json:"title" gorm:"size:192;not null;default:'';comment:文章标题"`
	// 摘要(微信 120 字节,超长推送时截断)
	Digest string `json:"digest" gorm:"size:255;not null;default:'';comment:摘要"`
	// 作者署名
	Author string `json:"author" gorm:"size:64;not null;default:'行简';comment:作者署名"`
	// 封面图 URL(空=推送时自动取正文首图)
	CoverURL string `json:"cover_url" gorm:"size:500;not null;default:'';comment:封面图URL"`
	// AI 生成:主题
	Theme string `json:"theme" gorm:"size:255;not null;default:'';comment:AI生成主题"`
	// AI 生成:要点(换行分隔)
	Points string `json:"points" gorm:"type:text;comment:AI生成要点"`
	// 正文 Markdown
	ContentMd string `json:"content_md" gorm:"type:longtext;comment:正文Markdown"`
	// draft=草稿,pushed=已推草稿箱,failed=推送失败
	Status string `json:"status" gorm:"size:16;not null;default:'draft';comment:状态"`
	// 微信草稿 media_id
	WxMediaID string `json:"wx_media_id" gorm:"size:128;not null;default:'';comment:微信草稿media_id"`
	// 最近一次推送错误
	ErrorMsg string `json:"error_msg" gorm:"size:500;not null;default:'';comment:最近推送错误"`
	// 推送草稿箱时间
	PushedAt *xtime.DateTime `json:"pushed_at" gorm:"comment:推送时间"`

	base.BaseModel
}

func (Article) TableName() string { return "mp_article" }
