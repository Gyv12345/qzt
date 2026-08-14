package cms

import "qzt-go-server/internal/model/base"

// page.go CMS 单页(关于我们/联系等)。以 slug 作为对外路由标识。

// CmsPage 单页。支持两种类型:内部内容页(link_type=page)和外部链接(link_type=link)。
type CmsPage struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	// 标题
	Title       string `json:"title" gorm:"size:255;not null;comment:标题"`
	// URL别名
	Slug        string `json:"slug" gorm:"uniqueIndex;size:128;comment:URL别名"`
	// page内部页/link外部链接
	LinkType    string `json:"link_type" gorm:"size:10;default:page;comment:page内部页/link外部链接"`
	// 外部链接URL(link_type=link时使用)
	ExternalURL string `json:"external_url" gorm:"size:500;comment:外部链接URL(link_type=link时使用)"`
	// 正文
	Content     string `json:"content" gorm:"type:longtext;comment:正文"`
	// 1启用 0禁用
	Status      int8   `json:"status" gorm:"default:1;comment:1启用 0禁用"`
	// 排序
	Sort        int    `json:"sort" gorm:"default:0;comment:排序"`
	base.BaseModel
}

func (CmsPage) TableName() string { return "cms_page" }
