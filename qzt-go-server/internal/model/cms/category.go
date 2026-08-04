package cms

import "qzt-go-server/internal/model/base"

// category.go CMS 文章分类。自引用树(仿 SysMenu)。

// 通用启用/禁用状态。
const (
	StatusDisabled int8 = 0 // 禁用
	StatusEnabled  int8 = 1 // 正常
)

// CmsCategory 文章分类。ParentID=0 表示根分类。
type CmsCategory struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	ParentID uint   `json:"parent_id" gorm:"default:0;index;comment:父分类ID(0为根)"`
	Name     string `json:"name" gorm:"size:64;not null;comment:分类名称"`
	Slug     string `json:"slug" gorm:"uniqueIndex;size:128;comment:URL别名"`
	Sort     int    `json:"sort" gorm:"default:0;comment:排序"`
	Status   int8   `json:"status" gorm:"default:1;comment:1启用 0禁用"`
	Remark   string `json:"remark" gorm:"size:255;comment:备注"`
	// Children 仅内存树，不落库。
	Children []*CmsCategory `json:"children,omitempty" gorm:"-"`
	base.BaseModel
}

func (CmsCategory) TableName() string { return "cms_category" }
