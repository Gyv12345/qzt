package crm

import (
	"qzt-go-server/internal/model/base"
)

// product_category.go CRM 产品分类树:分类定义的唯一来源。
// 迁自系统字典 PRODUCT_CATEGORY(字典 4 项与 crm_product.category 真实存量完全脱节,
// 树以产品真实分布为准)。crm_product.category 存量数据不动(仍存叶子名字符串),
// 本表只做「分类定义」:admin 树选择写叶子名进 category,官网按名字符串筛选。

// 产品分类状态。
const (
	ProductCategoryStatusOn  int8 = 1 // 启用
	ProductCategoryStatusOff int8 = 2 // 停用
)

// CrmProductCategory 产品分类树节点(ParentID=0 为顶层)。
type CrmProductCategory struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 父分类ID(0=顶层)
	ParentID uint `json:"parent_id" gorm:"not null;default:0;index;comment:父分类ID(0=顶层)"`
	// 分类名称(同层唯一)
	Name string `json:"name" gorm:"size:64;not null;comment:分类名称(同层唯一)"`
	// 排序号(升序)
	Sort int `json:"sort" gorm:"not null;default:0;comment:排序号(升序)"`
	// 1启用 2停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 2停用"`
	base.BaseModel
}

func (CrmProductCategory) TableName() string { return "crm_product_category" }
