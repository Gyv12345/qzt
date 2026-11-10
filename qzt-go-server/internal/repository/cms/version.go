package cms

import (
	"context"
	"qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// version.go P20 CMS 文章版本快照仓储。

// ArticleVersionRepo 版本快照仓储。
type ArticleVersionRepo struct {
	repository.BaseRepo[cms.CmsArticleVersion]
}

func NewArticleVersionRepo() *ArticleVersionRepo { return &ArticleVersionRepo{} }

// versionRetention 每篇文章保留的版本数上限。
const versionRetention = 20

// NextVersionNo 取该文章当前最大版本号+1。
func (r *ArticleVersionRepo) NextVersionNo(ctx context.Context, articleID uint) (int, error) {
	var maxNo *int
	err := repository.DBFrom(ctx).Model(&cms.CmsArticleVersion{}).
		Select("MAX(version_no)").
		Where("article_id = ?", articleID).
		Scan(&maxNo).Error
	if err != nil {
		return 0, err
	}
	if maxNo == nil {
		return 1, nil
	}
	return *maxNo + 1, nil
}

// CreateSnapshot 落一条版本快照，并清理超出保留上限的最旧版本。
func (r *ArticleVersionRepo) CreateSnapshot(ctx context.Context, v *cms.CmsArticleVersion) error {
	if v.VersionNo <= 0 {
		var err error
		if v.VersionNo, err = r.NextVersionNo(ctx, v.ArticleID); err != nil {
			return err
		}
	}
	if err := r.Create(ctx, v); err != nil {
		return err
	}
	// 保留最近 versionRetention 版,清最旧(best-effort,失败不阻断保存)
	var staleIDs []uint
	if err := repository.DBFrom(ctx).Model(&cms.CmsArticleVersion{}).
		Select("id").
		Where("article_id = ?", v.ArticleID).
		Order("version_no DESC").Offset(versionRetention).
		Limit(50).Pluck("id", &staleIDs).Error; err != nil {
		return nil
	}
	if len(staleIDs) > 0 {
		_ = repository.DBFrom(ctx).Delete(&cms.CmsArticleVersion{}, staleIDs).Error
	}
	return nil
}

// ListByArticle 按文章列版本(新→旧),最多 limit 条。
func (r *ArticleVersionRepo) ListByArticle(ctx context.Context, articleID uint, limit int) ([]cms.CmsArticleVersion, error) {
	var list []cms.CmsArticleVersion
	err := repository.DBFrom(ctx).Model(&cms.CmsArticleVersion{}).
		Where("article_id = ?", articleID).
		Order("version_no DESC").Limit(limit).Find(&list).Error
	return list, err
}

// GetVersion 取单条版本。
func (r *ArticleVersionRepo) GetVersion(ctx context.Context, articleID, versionID uint) (*cms.CmsArticleVersion, error) {
	var v cms.CmsArticleVersion
	err := repository.DBFrom(ctx).Model(&cms.CmsArticleVersion{}).
		Where("article_id = ? AND id = ?", articleID, versionID).
		First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}
