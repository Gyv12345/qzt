package cms

import (
	"context"
	"time"

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
		"AuthorID", "AuthorName", "Status", "PublishAt", "ExpireAt", "IsTop", "IsHot", "ViewCount", "Sort")
}

// IncrementView 原子递增浏览量（best-effort，失败不阻断读取）。
func (r *ArticleRepo) IncrementView(ctx context.Context, id uint) error {
	return repository.DBFrom(ctx).Model(&cmsmodel.CmsArticle{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

// ListRecentlyUpdatedPublished 近期有更新且已发布的文章(供搜索引擎推送兜底任务筛选)。
// 按 updated_at 倒序,limit 截断。
func (r *ArticleRepo) ListRecentlyUpdatedPublished(ctx context.Context, since time.Time, limit int) ([]cmsmodel.CmsArticle, error) {
	var list []cmsmodel.CmsArticle
	err := repository.DBFrom(ctx).Model(&cmsmodel.CmsArticle{}).
		Where("status = ? AND updated_at >= ? AND slug <> ''", cmsmodel.ArticleStatusPublished, since).
		Where("(expire_at IS NULL OR expire_at > NOW())").
		Order("updated_at DESC").Limit(limit).Find(&list).Error
	return list, err
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

// PublicVisibleCond 公开可见性守卫（P19）：status=已发布 且 定时发布时间已到 且 未过期。
// 服务端可信 SQL（无客户端输入），公开列表/slug 详情/id 详情/md 镜像/sitemap 同源共用。
func PublicVisibleCond() repository.Cond {
	return repository.Cond{
		Query: "(publish_at IS NULL OR publish_at <= NOW()) AND (expire_at IS NULL OR expire_at > NOW())",
	}
}

// ListDueToPublish 查询「刚到点」的文章（publish_at ∈ (from,to]，已发布、未过期、有 slug），
// 供到点推送定时任务筛选。窗口由调用方给定（每分钟任务传 10 分钟容错窗口）。
func (r *ArticleRepo) ListDueToPublish(ctx context.Context, from, to time.Time) ([]cmsmodel.CmsArticle, error) {
	var list []cmsmodel.CmsArticle
	err := repository.DBFrom(ctx).Model(&cmsmodel.CmsArticle{}).
		Where("status = ? AND publish_at > ? AND publish_at <= ? AND slug <> ''", cmsmodel.ArticleStatusPublished, from, to).
		Where("(expire_at IS NULL OR expire_at > NOW())").
		Order("publish_at ASC").Find(&list).Error
	return list, err
}

// SearchPublished 全文搜索公开可见文章（P21）。
// MySQL ngram 全文检索（MATCH 列与 ft_cms_article_search 索引列一致：title/summary/content），
// 叠加 P19 公开守卫（已发布+定时到点+未过期）。
func (r *ArticleRepo) SearchPublished(ctx context.Context, q string, page, pageSize int) ([]cmsmodel.CmsArticle, int64, error) {
	db := repository.DBFrom(ctx).Model(&cmsmodel.CmsArticle{}).
		Where("MATCH(title, summary, content) AGAINST(? IN NATURAL LANGUAGE MODE)", q).
		Where("status = ?", cmsmodel.ArticleStatusPublished).
		Where("(publish_at IS NULL OR publish_at <= NOW())").
		Where("(expire_at IS NULL OR expire_at > NOW())")
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []cmsmodel.CmsArticle
	if err := db.Preload("Category").
		Order("is_top DESC, sort ASC, id DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}
