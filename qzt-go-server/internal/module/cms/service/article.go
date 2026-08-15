package service

import (
	"context"
	"strconv"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
	cmsrepo "qzt-go-server/internal/repository/cms"
)

// ArticleService 文章服务。
type ArticleService struct {
	articleRepo *cmsrepo.ArticleRepo
}

func NewArticleService() *ArticleService {
	return &ArticleService{articleRepo: cmsrepo.NewArticleRepo()}
}

// CreateArticleRequest 创建文章请求。
type CreateArticleRequest struct {
	Title      string `json:"title" binding:"required"`
	Slug       string `json:"slug"`
	Summary    string `json:"summary"`
	Content    string `json:"content"`
	CoverURL   string `json:"cover_url"`
	CategoryID uint   `json:"category_id"`
	Status     *int8  `json:"status"`
	IsTop      *int8  `json:"is_top"`
	IsHot      *int8  `json:"is_hot"`
	Sort       int    `json:"sort"`
	TagIDs     []uint `json:"tag_ids"`
}

// Create 由管理端创建。作者信息由 handler 从鉴权上下文传入。
func (s *ArticleService) Create(ctx context.Context, req *CreateArticleRequest, authorID uint, authorName string) (*cmsmodel.CmsArticle, error) {
	status := cmsmodel.ArticleStatusDraft
	if req.Status != nil {
		status = *req.Status
	}
	var isTop, isHot int8
	if req.IsTop != nil {
		isTop = *req.IsTop
	}
	if req.IsHot != nil {
		isHot = *req.IsHot
	}

	article := &cmsmodel.CmsArticle{
		Title:      req.Title,
		Slug:       req.Slug,
		Summary:    req.Summary,
		Content:    req.Content,
		CoverURL:   req.CoverURL,
		CategoryID: req.CategoryID,
		AuthorID:   authorID,
		AuthorName: authorName,
		Status:     status,
		IsTop:      isTop,
		IsHot:      isHot,
		Sort:       req.Sort,
	}

	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.articleRepo.Create(ctx, article); err != nil {
			return err
		}
		if len(req.TagIDs) > 0 {
			return s.articleRepo.SetTags(ctx, article.ID, req.TagIDs)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return article, nil
}

func (s *ArticleService) GetByID(ctx context.Context, id uint) (*cmsmodel.CmsArticle, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "文章不存在")
	}
	return article, nil
}

// GetBySlug 按 slug 查询已发布文章（公开访问），并原子递增浏览量。
func (s *ArticleService) GetBySlug(ctx context.Context, slug string) (*cmsmodel.CmsArticle, error) {
	article, err := s.articleRepo.GetOne(ctx, &repository.QueryOptions{
		Where:    map[string]any{"slug": slug, "status": cmsmodel.ArticleStatusPublished},
		Preloads: []string{"Category", "Tags"},
	})
	if err != nil {
		return nil, repository.NotFoundOr(err, "文章不存在")
	}
	// best-effort 递增浏览量，失败不阻断读取
	_ = s.articleRepo.IncrementView(ctx, article.ID)
	return article, nil
}

// UpdateArticleRequest 更新文章请求。
type UpdateArticleRequest struct {
	Title      string  `json:"title" binding:"required"`
	Slug       string  `json:"slug"`
	Summary    string  `json:"summary"`
	Content    string  `json:"content"`
	CoverURL   string  `json:"cover_url"`
	CategoryID uint    `json:"category_id"`
	Status     *int8   `json:"status"`
	IsTop      *int8   `json:"is_top"`
	IsHot      *int8   `json:"is_hot"`
	Sort       int     `json:"sort"`
	TagIDs     *[]uint `json:"tag_ids"`
}

// Update 更新文章。TagIDs 非 nil 时整体替换标签。
func (s *ArticleService) Update(ctx context.Context, id uint, req *UpdateArticleRequest, authorID uint, authorName string) error {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "文章不存在")
	}

	article.Title = req.Title
	article.Slug = req.Slug
	article.Summary = req.Summary
	article.Content = req.Content
	article.CoverURL = req.CoverURL
	article.CategoryID = req.CategoryID
	article.AuthorID = authorID
	article.AuthorName = authorName
	if req.Status != nil {
		article.Status = *req.Status
	}
	if req.IsTop != nil {
		article.IsTop = *req.IsTop
	}
	if req.IsHot != nil {
		article.IsHot = *req.IsHot
	}
	article.Sort = req.Sort

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.articleRepo.Update(ctx, article); err != nil {
			return err
		}
		if req.TagIDs != nil {
			return s.articleRepo.SetTags(ctx, id, *req.TagIDs)
		}
		return nil
	})
}

func (s *ArticleService) Delete(ctx context.Context, id uint) error {
	if _, err := s.articleRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "文章不存在")
	}
	return s.articleRepo.Delete(ctx, id)
}

// ListArticleQuery 文章列表过滤参数。
type ListArticleQuery struct {
	Keyword    string
	CategoryID uint
	Status     *int8
	TagID      uint
}

// List 管理端分页列表，支持关键字/分类/状态/标签过滤。
func (s *ArticleService) List(ctx context.Context, page, pageSize int, q *ListArticleQuery) ([]cmsmodel.CmsArticle, int64, error) {
	if q != nil && q.TagID > 0 {
		// 按标签过滤走专用查询（需 join 关联表）
		status := int8(-1) // 不限状态
		if q.Status != nil {
			status = *q.Status
		}
		return s.articleRepo.PageListByTag(ctx, page, pageSize, q.TagID, q.Keyword, status)
	}

	opts := &repository.QueryOptions{
		Preloads: []string{"Category", "Tags"},
		Order:    []string{"is_top DESC", "sort ASC", "id DESC"},
	}
	if q != nil {
		if q.Keyword != "" {
			opts.Search = map[string]string{"title": q.Keyword, "slug": q.Keyword}
		}
		if q.CategoryID > 0 {
			if opts.Where == nil {
				opts.Where = map[string]any{}
			}
			opts.Where["category_id"] = q.CategoryID
		}
		if q.Status != nil {
			if opts.Where == nil {
				opts.Where = map[string]any{}
			}
			opts.Where["status"] = *q.Status
		}
	}
	return s.articleRepo.PageList(ctx, page, pageSize, opts)
}

// ListPublished 公开已发布文章分页列表。
func (s *ArticleService) ListPublished(ctx context.Context, page, pageSize int, keyword, categoryIDStr string) ([]cmsmodel.CmsArticle, int64, error) {
	opts := &repository.QueryOptions{
		Where:    map[string]any{"status": cmsmodel.ArticleStatusPublished},
		Preloads: []string{"Category"},
		Order:    []string{"is_top DESC", "sort ASC", "id DESC"},
	}
	if keyword != "" {
		opts.Search = map[string]string{"title": keyword, "slug": keyword}
	}
	if categoryIDStr != "" {
		if cid, err := strconv.ParseUint(categoryIDStr, 10, 64); err == nil && cid > 0 {
			opts.Where["category_id"] = uint(cid)
		}
	}
	return s.articleRepo.PageList(ctx, page, pageSize, opts)
}
