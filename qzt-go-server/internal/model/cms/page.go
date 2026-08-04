package cms

import "qzt-go-server/internal/model/base"

// page.go CMS 单页(关于我们/联系等)。以 slug 作为对外路由标识。

// CmsPage 单页。
type CmsPage struct {
	ID      uint   `json:"id" gorm:"primaryKey"`
	Title   string `json:"title" gorm:"size:255;not null;comment:标题"`
	Slug    string `json:"slug" gorm:"uniqueIndex;size:128;comment:URL别名"`
	Content string `json:"content" gorm:"type:longtext;comment:正文"`
	Status  int8   `json:"status" gorm:"default:1;comment:1启用 0禁用"`
	Sort    int    `json:"sort" gorm:"default:0;comment:排序"`
	base.BaseModel
}

func (CmsPage) TableName() string { return "cms_page" }
