package cms

import "qzt-go-server/internal/model/base"

// tag.go CMS 文章标签。与文章为多对多(关联表 cms_article_tag)。

// CmsTag 标签。
type CmsTag struct {
	ID     uint   `json:"id" gorm:"primaryKey"`
	// 标签名称
	Name   string `json:"name" gorm:"size:64;not null;comment:标签名称"`
	// URL别名
	Slug   string `json:"slug" gorm:"uniqueIndex;size:128;comment:URL别名"`
	// 排序
	Sort   int    `json:"sort" gorm:"default:0;comment:排序"`
	// 1启用 0禁用
	Status int8   `json:"status" gorm:"default:1;comment:1启用 0禁用"`
	base.BaseModel
}

func (CmsTag) TableName() string { return "cms_tag" }
