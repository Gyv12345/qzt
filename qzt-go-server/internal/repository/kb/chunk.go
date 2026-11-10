package kb

import (
	"context"

	kbmodel "qzt-go-server/internal/model/kb"
	"qzt-go-server/internal/repository"
)

// ChunkRepo 知识库文档切片 repository。切片是派生数据（reindex 硬删重建），
// 全部走硬删除，不经过软删除。
type ChunkRepo struct {
	repository.BaseRepo[kbmodel.KbChunk]
}

func NewChunkRepo() *ChunkRepo { return &ChunkRepo{} }

// DeleteByDoc 硬删某文档的全部切片（reindex / 文档删除时调用）。
func (r *ChunkRepo) DeleteByDoc(ctx context.Context, docID uint) error {
	return repository.DBFrom(ctx).Unscoped().
		Where("document_id = ?", docID).
		Delete(&kbmodel.KbChunk{}).Error
}

// ReplaceDocChunks 事务内替换某文档切片：硬删旧 + 批量插入新。
func (r *ChunkRepo) ReplaceDocChunks(ctx context.Context, docID uint, chunks []kbmodel.KbChunk) error {
	return repository.Transaction(ctx, func(tx context.Context) error {
		if err := r.DeleteByDoc(tx, docID); err != nil {
			return err
		}
		if len(chunks) == 0 {
			return nil
		}
		return repository.DBFrom(tx).Create(&chunks).Error
	})
}

// ListByDoc 按文档取切片（含 failed，供详情展示切片数/失败状态）。
func (r *ChunkRepo) ListByDoc(ctx context.Context, docID uint) ([]kbmodel.KbChunk, error) {
	var list []kbmodel.KbChunk
	err := repository.DBFrom(ctx).
		Where("document_id = ?", docID).
		Order("seq ASC").Find(&list).Error
	return list, err
}

// ListReady 取全部已向量化切片（暴力余弦检索的数据源）。
// 剔除 embedding 为空/NULL 与 status != ready，防脏数据混入检索。
func (r *ChunkRepo) ListReady(ctx context.Context) ([]kbmodel.KbChunk, error) {
	var list []kbmodel.KbChunk
	err := repository.DBFrom(ctx).
		Where("status = ? AND embedding IS NOT NULL AND embedding != ''", "ready").
		Find(&list).Error
	return list, err
}

// CountByDoc 文档切片数（admin 列表展示）。
func (r *ChunkRepo) CountByDoc(ctx context.Context, docID uint) (int64, error) {
	var n int64
	err := repository.DBFrom(ctx).Model(&kbmodel.KbChunk{}).
		Where("document_id = ?", docID).Count(&n).Error
	return n, err
}

// CountByDocs 批量统计多文档切片数（admin 列表一次填充，单条 GROUP BY）。
func (r *ChunkRepo) CountByDocs(ctx context.Context, docIDs []uint) (map[uint]int64, error) {
	out := make(map[uint]int64, len(docIDs))
	if len(docIDs) == 0 {
		return out, nil
	}
	var rows []struct {
		DocumentID uint   `gorm:"column:document_id"`
		Status     string `gorm:"column:status"`
		N          int64  `gorm:"column:n"`
	}
	err := repository.DBFrom(ctx).Model(&kbmodel.KbChunk{}).
		Select("document_id, status, COUNT(*) AS n").
		Where("document_id IN ?", docIDs).
		Group("document_id, status").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.DocumentID] += r.N
	}
	return out, nil
}

// ListSimple（DocumentRepo 扩展，P17）全量文档 id+标题（检索命中标题映射用，kb 文档量小直接取）。
func (r *DocumentRepo) ListSimple(ctx context.Context) ([]kbmodel.KbDocument, error) {
	var list []kbmodel.KbDocument
	err := repository.DBFrom(ctx).Select("id", "title").Find(&list).Error
	return list, err
}
