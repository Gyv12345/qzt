package kb

import (
	"qzt-go-server/internal/model/base"
)

// KbCategory 知识库分类(树形)。
type KbCategory struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	// 父分类ID(0=顶级)
	ParentID  uint   `json:"parent_id" gorm:"default:0;index;comment:父分类ID(0=顶级)"`
	// 分类名称
	Name      string `json:"name" gorm:"size:100;not null;comment:分类名称"`
	// 排序
	Sort      int    `json:"sort" gorm:"default:0;comment:排序"`
	// 状态(0停用1启用)
	Status    int8   `json:"status" gorm:"default:1;comment:状态(0停用1启用)"`
	// 创建人ID
	CreatorID uint   `json:"creator_id" gorm:"comment:创建人ID"`
	base.BaseModel
}

func (KbCategory) TableName() string { return "kb_category" }
