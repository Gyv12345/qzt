package cms

import (
	"context"

	"gorm.io/gorm"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// article.go CMS 文章 repository。分类(belongs to)、标签(many2many)。

// ArticleRepo 文章仓储。
type ArticleRepo struct {
	repository.BaseRepo[cmsmodel.CmsArticle]
}

func NewArticleRepo() *ArticleRepo { return &ArticleRepo{} }

// GetByID 覆写：预加载分类与标签。
func (r *ArticleRepo) GetByID(ctx context.Context, id uint) (*cmsmodel.CmsArticle, error) {
	return r.BaseRepo.GetByID(ctx, id, "Category", "Tags")
}

// Update 仅更新基础列；标签由 SetTags 管理，避免写回关联。
func (r *ArticleRepo) Update(ctx context.Context, m *cmsmodel.CmsArticle) error {
	return r.BaseRepo.Update(ctx, m,
		"Title", "Slug", "Summary", "Content", "CoverURL", "CategoryID",
		"AuthorID", "AuthorName", "Status", "IsTop", "IsHot", "ViewCount", "Sort")
}

// IncrementView 原子递增浏览量（best-effort，失败不阻断读取）。
func (r *ArticleRepo) IncrementView(ctx context.Context, id uint) error {
	return repository.DBFrom(ctx).Model(&cmsmodel.CmsArticle{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

// SetTags 整体替换文章标签（全量覆盖）。tagIDs 为空则清空。
func (r *ArticleRepo) SetTags(ctx context.Context, articleID uint, tagIDs []uint) error {
	article := &cmsmodel.CmsArticle{ID: articleID}
	tags := make([]cmsmodel.CmsTag, 0, len(tagIDs))
	for _, tid := range tagIDs {
		tags = append(tags, cmsmodel.CmsTag{ID: tid})
	}
	return repository.DBFrom(ctx).Model(article).Association("Tags").Replace(&tags)
}

// PageListByTag 按标签分页查询文章（关联表 cms_article_tag 过滤）。
// keyword 为标题/别名模糊；status 为文章状态过滤（传 -1 表示不过滤）。
// 直接用 GORM 构建，避免依赖 repository.QueryOptions 的未导出 apply 方法。
func (r *ArticleRepo) PageListByTag(ctx context.Context, page, pageSize int, tagID uint, keyword string, status int8) ([]cmsmodel.CmsArticle, int64, error) {
	db := repository.DBFrom(ctx).Model(&cmsmodel.CmsArticle{}).
		Joins("JOIN cms_article_tag ON cms_article_tag.cms_article_id = cms_article.id").
		Where("cms_article_tag.cms_tag_id = ?", tagID)
	if keyword != "" {
		kw := "%" + keyword + "%"
		db = db.Where("cms_article.title LIKE ? OR cms_article.slug LIKE ?", kw, kw)
	}
	if status >= 0 {
		db = db.Where("cms_article.status = ?", status)
	}

	var total int64
	if err := db.Distinct("cms_article.id").Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []cmsmodel.CmsArticle
	if err := db.Preload("Category").Preload("Tags").
		Order("cms_article.is_top DESC, cms_article.sort ASC, cms_article.id DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}
