package cloud

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// CloudShare 网盘文件分享链接(免登录下载)。
type CloudShare struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 分享令牌(43 位 base64url,crypto/rand 32 字节生成)
	Token string `json:"token" gorm:"size:64;not null;uniqueIndex;comment:分享令牌"`
	// 被分享的文件ID
	FileID uint `json:"file_id" gorm:"index;comment:被分享的文件ID"`
	// 创建人(分享所有者)
	OwnerID uint `json:"owner_id" gorm:"index;comment:创建人(分享所有者)"`
	// 提取码(可空,4-12 位字母数字)
	ExtractCode string `json:"extract_code" gorm:"size:16;default:'';comment:提取码(可空)"`
	// 过期时间
	ExpireAt xtime.DateTime `json:"expire_at" gorm:"type:datetime;not null;comment:过期时间"`
	// 1=已取消
	Disabled int8 `json:"disabled" gorm:"default:0;comment:0正常 1=已取消"`
	// 累计下载次数
	DownloadCount int `json:"download_count" gorm:"default:0;comment:累计下载次数"`
	base.BaseModel
}

func (CloudShare) TableName() string { return "cloud_share" }
