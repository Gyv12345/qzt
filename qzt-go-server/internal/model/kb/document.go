package kb

import (
	"qzt-go-server/internal/model/base"
)

// KbDocument 知识库文档。
type KbDocument struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	// 分类ID
	CategoryID   uint   `json:"category_id" gorm:"default:0;index;comment:分类ID"`
	// 标题
	Title        string `json:"title" gorm:"size:200;not null;comment:标题"`
	// 内容(HTML快照)
	Content      string `json:"content" gorm:"type:longtext;comment:内容(HTML快照)"`
	// 状态(draft/published)
	Status       string `json:"status" gorm:"size:20;default:draft;index;comment:状态(draft/published)"`
	// 创建人ID
	CreatorID    uint   `json:"creator_id" gorm:"comment:创建人ID"`
	// 最后编辑人ID
	LastEditorID *uint  `json:"last_editor_id" gorm:"comment:最后编辑人ID"`
	// 浏览次数
	ViewCount    int    `json:"view_count" gorm:"default:0;comment:浏览次数"`
	base.BaseModel
}

func (KbDocument) TableName() string { return "kb_document" }
