package cms

import "qzt-go-server/internal/model/base"

// page.go CMS 单页(关于我们/联系等)。以 slug 作为对外路由标识。

// CmsPage 单页。支持两种类型:内部内容页(link_type=page)和外部链接(link_type=link)。
type CmsPage struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Title       string `json:"title" gorm:"size:255;not null;comment:标题"`
	Slug        string `json:"slug" gorm:"uniqueIndex;size:128;comment:URL别名"`
	LinkType    string `json:"link_type" gorm:"size:10;default:page;comment:page内部页/link外部链接"`
	ExternalURL string `json:"external_url" gorm:"size:500;comment:外部链接URL(link_type=link时使用)"`
	Content     string `json:"content" gorm:"type:longtext;comment:正文"`
	Status      int8   `json:"status" gorm:"default:1;comment:1启用 0禁用"`
	Sort        int    `json:"sort" gorm:"default:0;comment:排序"`
	base.BaseModel
}

func (CmsPage) TableName() string { return "cms_page" }
