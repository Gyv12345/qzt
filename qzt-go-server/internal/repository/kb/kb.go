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
