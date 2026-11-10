package service

import (
	"context"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
	cmsrepo "qzt-go-server/internal/repository/cms"
	"qzt-go-server/pkg/xlogger"
)

// version.go P20 文章版本快照与回滚。
// 快照时机：admin 更新文章(ArticleService.Update)前快照旧内容；
// 回滚：目标版本内容写回正文,写回前再快照当前态(链不断),每篇保留最近 20 版。

// VersionService 版本快照服务。
type VersionService struct {
	articleRepo *cmsrepo.ArticleRepo
	versionRepo *cmsrepo.ArticleVersionRepo
}

func NewVersionService() *VersionService {
	return &VersionService{articleRepo: cmsrepo.NewArticleRepo(), versionRepo: cmsrepo.NewArticleVersionRepo()}
}

// CreateSnapshotForArticle 保存前快照旧内容(仅 admin 更新链路调用)。
func (s *VersionService) CreateSnapshotForArticle(ctx context.Context, a *cmsmodel.CmsArticle, editorID uint, editorName string) {
	v := &cmsmodel.CmsArticleVersion{
		ArticleID:  a.ID,
		Title:      a.Title,
		Summary:    a.Summary,
		Content:    a.Content,
		CoverURL:   a.CoverURL,
		EditorID:   editorID,
		EditorName: editorName,
	}
	if err := s.versionRepo.CreateSnapshot(ctx, v); err != nil {
		// 快照失败不阻断保存,只记日志
		xlogger.ErrorfCtx(ctx, "cms: 版本快照失败 article=%d: %v", a.ID, err)
	}
}

// List 版本列表(新→旧,封顶 50 条防失控)。
func (s *VersionService) List(ctx context.Context, articleID uint, page, pageSize int) ([]cmsmodel.CmsArticleVersion, int64, error) {
	list, err := s.versionRepo.ListByArticle(ctx, articleID, min(pageSize, 50))
	if err != nil {
		return nil, 0, err
	}
	return list, int64(len(list)), nil
}

// Rollback 把版本内容写回文章,写回前快照当前态。
// 保持 slug/status/tags/排期字段不动,只还原 title/summary/content/cover_url。
func (s *VersionService) Rollback(ctx context.Context, articleID, versionID uint, editorID uint, editorName string) (*cmsmodel.CmsArticle, error) {
	article, err := s.articleRepo.GetByID(ctx, articleID)
	if err != nil {
		return nil, repository.NotFoundOr(err, "文章不存在")
	}
	v, err := s.versionRepo.GetVersion(ctx, articleID, versionID)
	if err != nil {
		return nil, repository.NotFoundOr(err, "版本不存在")
	}
	// 写回前快照当前态(版本链不断)
	s.CreateSnapshotForArticle(ctx, article, editorID, editorName)

	article.Title = v.Title
	article.Summary = v.Summary
	article.Content = v.Content
	article.CoverURL = v.CoverURL
	if err := s.articleRepo.Update(ctx, article); err != nil {
		return nil, err
	}
	TriggerArticlePush(article)
	return article, nil
}
