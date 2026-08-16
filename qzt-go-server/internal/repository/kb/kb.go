package kb

import (
	"context"

	kbmodel "qzt-go-server/internal/model/kb"
	"qzt-go-server/internal/repository"
)

// CategoryRepo 知识库分类 repository。
type CategoryRepo struct {
	repository.BaseRepo[kbmodel.KbCategory]
}

func NewCategoryRepo() *CategoryRepo { return &CategoryRepo{} }

// ListAll 查全部分类(树形构建用)。
func (r *CategoryRepo) ListAll(ctx context.Context) ([]kbmodel.KbCategory, error) {
	var list []kbmodel.KbCategory
	err := repository.DBFrom(ctx).Where("status = 1").Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

func (r *CategoryRepo) Update(ctx context.Context, m *kbmodel.KbCategory) error {
	return r.BaseRepo.Update(ctx, m, "ParentID", "Name", "Sort", "Status")
}

// DocumentRepo 知识库文档 repository。
type DocumentRepo struct {
	repository.BaseRepo[kbmodel.KbDocument]
}

func NewDocumentRepo() *DocumentRepo { return &DocumentRepo{} }

func (r *DocumentRepo) PageList(ctx context.Context, page, pageSize int, categoryID uint, keyword, status string) ([]kbmodel.KbDocument, int64, error) {
	var list []kbmodel.KbDocument
	q := repository.DBFrom(ctx).Model(&kbmodel.KbDocument{})
	if categoryID > 0 {
		q = q.Where("category_id = ?", categoryID)
	}
	if keyword != "" {
		q = q.Where("title LIKE ?", "%"+keyword+"%")
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *DocumentRepo) Update(ctx context.Context, m *kbmodel.KbDocument) error {
	return r.BaseRepo.Update(ctx, m, "CategoryID", "Title", "Content", "Status", "LastEditorID", "ViewCount")
}

// SaveSnapshot 保存文档快照:更新文档内容(显式写 updated_at=NOW(),沿用原
// Table 原生更新语义)并追加一条版本历史(版本号 = 当前最大版本 + 1)。
// 协同编辑 WebSocket 保存用;max version 查询出错沿袭原语义:忽略,按 0 计。
func (r *DocumentRepo) SaveSnapshot(ctx context.Context, docID, editorID uint, content string) error {
	db := repository.DBFrom(ctx)

	// 更新文档内容
	if err := db.Table("kb_document").Where("id = ?", docID).
		Updates(map[string]any{
			"content":        content,
			"last_editor_id": editorID,
			"updated_at":     "NOW()",
		}).Error; err != nil {
		return err
	}

	// 创建版本历史
	var maxVer int
	db.Table("kb_version").Where("document_id = ?", docID).Select("COALESCE(MAX(version_number), 0)").Scan(&maxVer)
	return db.Table("kb_version").Create(map[string]any{
		"document_id":    docID,
		"content":        content,
		"editor_id":      editorID,
		"version_number": maxVer + 1,
		"created_at":     "NOW()",
	}).Error
}

// VersionRepo 知识库版本 repository。
type VersionRepo struct {
	repository.BaseRepo[kbmodel.KbVersion]
}

func NewVersionRepo() *VersionRepo { return &VersionRepo{} }

func (r *VersionRepo) ListByDoc(ctx context.Context, docID uint, page, pageSize int) ([]kbmodel.KbVersion, int64, error) {
	var list []kbmodel.KbVersion
	q := repository.DBFrom(ctx).Model(&kbmodel.KbVersion{}).Where("document_id = ?", docID)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("version_number DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}
