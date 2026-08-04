package cms

import (
	"context"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// category.go CMS 文章分类 repository。

// CategoryRepo 分类仓储。
type CategoryRepo struct {
	repository.BaseRepo[cmsmodel.CmsCategory]
}

func NewCategoryRepo() *CategoryRepo { return &CategoryRepo{} }

// Update 仅更新基础列。
func (r *CategoryRepo) Update(ctx context.Context, m *cmsmodel.CmsCategory) error {
	return r.BaseRepo.Update(ctx, m, "ParentID", "Name", "Slug", "Sort", "Status", "Remark")
}

// GetBySlug 按 slug 查询单个分类。
func (r *CategoryRepo) GetBySlug(ctx context.Context, slug string) (*cmsmodel.CmsCategory, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"slug": slug},
	})
}

// ListAll 返回全部分类，按 sort、id 排序（供构建树/下拉）。
func (r *CategoryRepo) ListAll(ctx context.Context) ([]cmsmodel.CmsCategory, error) {
	return r.List(ctx, &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	})
}

// HasChildren 是否存在子分类（删除前校验）。
func (r *CategoryRepo) HasChildren(ctx context.Context, id uint) (bool, error) {
	return r.Exists(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"parent_id": id},
	})
}
