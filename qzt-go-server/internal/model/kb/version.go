package kb

// KbVersion 知识库版本历史(每次保存自动创建)。
type KbVersion struct {
	ID            uint   `json:"id" gorm:"primaryKey"`
	DocumentID    uint   `json:"document_id" gorm:"index;not null;comment:文档ID"`
	Content       string `json:"content" gorm:"type:longtext;comment:版本内容快照"`
	EditorID      uint   `json:"editor_id" gorm:"comment:编辑人ID"`
	VersionNote   string `json:"version_note" gorm:"size:200;comment:版本说明"`
	VersionNumber int    `json:"version_number" gorm:"comment:版本号(递增)"`
	CreatedAt     string `json:"created_at" gorm:"type:datetime(3);comment:创建时间"`
}

func (KbVersion) TableName() string { return "kb_version" }
