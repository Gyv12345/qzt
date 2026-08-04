package cms

import (
	"context"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// tag.go CMS 标签 repository。

// TagRepo 标签仓储。
type TagRepo struct {
	repository.BaseRepo[cmsmodel.CmsTag]
}

func NewTagRepo() *TagRepo { return &TagRepo{} }

// Update 仅更新基础列。
func (r *TagRepo) Update(ctx context.Context, m *cmsmodel.CmsTag) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Slug", "Sort", "Status")
}

// GetBySlug 按 slug 查询单个标签。
func (r *TagRepo) GetBySlug(ctx context.Context, slug string) (*cmsmodel.CmsTag, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"slug": slug},
	})
}

// ListAll 返回全部启用标签，按 sort、id 排序。
func (r *TagRepo) ListAll(ctx context.Context) ([]cmsmodel.CmsTag, error) {
	return r.List(ctx, &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	})
}
