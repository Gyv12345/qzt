package enterprise

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// notice.go 公告通知(sys_notice)。
// 发布/撤回/已发布列表,首页公告流。

// 公告类型。
const (
	NoticeTypeNotice   int8 = 1 // 通知
	NoticeTypeAnnounce int8 = 2 // 公告
)

// 公告状态。
const (
	NoticeStatusDraft    int8 = 0 // 草稿
	NoticeStatusPublish  int8 = 1 // 已发布
)

// SysNotice 公告通知。
type SysNotice struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Title       string `json:"title" gorm:"size:200;not null;comment:标题"`
	Content     string `json:"content" gorm:"type:text;comment:内容"`
	Type        int8   `json:"type" gorm:"default:1;index;comment:类型(1通知 2公告)"`
	Status      int8   `json:"status" gorm:"default:0;index;comment:状态(0草稿 1发布)"`
	PublishTime xtime.DateTime `json:"publish_time" gorm:"type:datetime;index;comment:发布时间"`
	base.BaseModel
}

func (SysNotice) TableName() string { return "sys_notice" }
