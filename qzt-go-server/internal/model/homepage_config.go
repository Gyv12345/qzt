package model

// homepage_config.go CMS 首页板块配置。
// cms_homepage_module: 板块开关(产品/合作伙伴/团队), 3 行固定数据。
// cms_homepage_feature: 精选条目(关联业务表 ID), 可多选。

import "qzt-go-server/internal/model/base"

// CmsHomepageModule 首页板块开关。
type CmsHomepageModule struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	// 模块标识(product/partner/team)
	Module     string `json:"module" gorm:"size:20;uniqueIndex;comment:模块标识(product/partner/team)"`
	// 模块中文名
	ModuleName string `json:"module_name" gorm:"size:50;comment:模块中文名"`
	// 是否在CMS首页显示
	Enabled    bool   `json:"enabled" gorm:"default:true;comment:是否在CMS首页显示"`
	// 板块排序
	Sort       int    `json:"sort" gorm:"default:0;comment:板块排序"`
	base.BaseModel
}

func (CmsHomepageModule) TableName() string { return "cms_homepage_module" }

// CmsHomepageFeature 首页精选条目。
type CmsHomepageFeature struct {
	ID     uint   `json:"id" gorm:"primaryKey"`
	// 模块标识
	Module string `json:"module" gorm:"size:20;index:idx_module_sort;comment:模块标识"`
	// 业务条目ID
	ItemID uint   `json:"item_id" gorm:"comment:业务条目ID"`
	// 展示排序
	Sort   int    `json:"sort" gorm:"default:0;index:idx_module_sort;comment:展示排序"`
	base.BaseModel
}

func (CmsHomepageFeature) TableName() string { return "cms_homepage_feature" }
