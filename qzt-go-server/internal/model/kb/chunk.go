package kb

import (
	"qzt-go-server/pkg/xtime"
)

// KbChunk 知识库文档切片（P17 知识库 RAG）。
// 派生数据：由文档内容切片+向量化生成，可随时重建（reindex 硬删旧插新），
// 因此不嵌 base.BaseModel（无软删除），与 KbVersion 同样走简单字段。
type KbChunk struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 文档ID
	DocumentID uint `json:"document_id" gorm:"index:idx_kb_chunk_doc_seq,unique;not null;comment:文档ID"`
	// 片内序号（从 0 递增）
	Seq int `json:"seq" gorm:"index:idx_kb_chunk_doc_seq,unique;not null;comment:片内序号"`
	// 切片正文（纯文本，已剥 HTML）
	Content string `json:"content" gorm:"type:text;not null;comment:切片正文"`
	// 嵌入向量（JSON 数组，[]float64）
	Embedding string `json:"-" gorm:"type:json;comment:嵌入向量JSON"`
	// 向量维度（供应商变更模型后便于对账）
	VectorDim int `json:"vector_dim" gorm:"not null;default:0;comment:向量维度"`
	// ready=已向量化可用 failed=向量化失败（重建索引重放）
	Status string `json:"status" gorm:"size:16;not null;default:ready;comment:ready/failed"`
	// 向量化失败原因摘要
	ErrMsg string `json:"error" gorm:"size:255;not null;default:'';comment:失败原因摘要"`
	// 切片字符数
	CharCount int `json:"char_count" gorm:"not null;default:0;comment:切片字符数"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime `json:"updated_at" gorm:"autoUpdateTime"`
}

func (KbChunk) TableName() string { return "kb_chunk" }
