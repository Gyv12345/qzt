package cms

import (
	"context"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// page.go CMS 单页 repository。

// PageRepo 单页仓储。
type PageRepo struct {
	repository.BaseRepo[cmsmodel.CmsPage]
}

func NewPageRepo() *PageRepo { return &PageRepo{} }

// Update 仅更新基础列。
func (r *PageRepo) Update(ctx context.Context, m *cmsmodel.CmsPage) error {
	return r.BaseRepo.Update(ctx, m, "Title", "Slug", "LinkType", "ExternalURL", "Content", "Status", "Sort")
}

// GetBySlug 按 slug 查询单页（公开访问用）。
func (r *PageRepo) GetBySlug(ctx context.Context, slug string) (*cmsmodel.CmsPage, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"slug": slug},
	})
}
