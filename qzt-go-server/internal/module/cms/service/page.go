package service

import (
	"context"
	"errors"

	"gorm.io/gorm"
	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
	cmsrepo "qzt-go-server/internal/repository/cms"
)

// PageService 单页服务。
type PageService struct {
	pageRepo *cmsrepo.PageRepo
}

func NewPageService() *PageService {
	return &PageService{pageRepo: cmsrepo.NewPageRepo()}
}

// CreatePageRequest 创建单页请求。
type CreatePageRequest struct {
	Title       string `json:"title" binding:"required"`
	Slug        string `json:"slug" binding:"required"`
	LinkType    string `json:"link_type"`
	ExternalURL string `json:"external_url"`
	Content     string `json:"content"`
	Status      *int8  `json:"status"`
	Sort        int    `json:"sort"`
}

func (s *PageService) Create(ctx context.Context, req *CreatePageRequest) error {
	status := cmsmodel.StatusEnabled
	if req.Status != nil {
		status = *req.Status
	}

	if req.Slug != "" {
		exists, err := s.pageRepo.Exists(ctx, &repository.QueryOptions{
			Where: map[string]any{"slug": req.Slug},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("单页别名已存在")
		}
	}

	linkType := req.LinkType
	if linkType == "" {
		linkType = "page"
	}
	page := &cmsmodel.CmsPage{
		Title:       req.Title,
		Slug:        req.Slug,
		LinkType:    linkType,
		ExternalURL: req.ExternalURL,
		Content:     req.Content,
		Status:      status,
		Sort:        req.Sort,
	}
	if err := s.pageRepo.Create(ctx, page); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("单页别名已存在")
		}
		return err
	}
	return nil
}

func (s *PageService) GetByID(ctx context.Context, id uint) (*cmsmodel.CmsPage, error) {
	page, err := s.pageRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "单页不存在")
	}
	return page, nil
}

// GetBySlug 按 slug 查询单页（公开访问）。
func (s *PageService) GetBySlug(ctx context.Context, slug string) (*cmsmodel.CmsPage, error) {
	page, err := s.pageRepo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, repository.NotFoundOr(err, "单页不存在")
	}
	return page, nil
}

// ListEnabled 返回所有启用的单页(公开导航用)。
func (s *PageService) ListEnabled(ctx context.Context) ([]cmsmodel.CmsPage, error) {
	return s.pageRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": cmsmodel.StatusEnabled},
		Order: []string{"sort ASC"},
	})
}

// UpdatePageRequest 更新单页请求。
type UpdatePageRequest struct {
	Title       string `json:"title" binding:"required"`
	Slug        string `json:"slug" binding:"required"`
	LinkType    string `json:"link_type"`
	ExternalURL string `json:"external_url"`
	Content     string `json:"content"`
	Status      *int8  `json:"status"`
	Sort        int    `json:"sort"`
}

func (s *PageService) Update(ctx context.Context, id uint, req *UpdatePageRequest) error {
	page, err := s.pageRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "单页不存在")
	}
	if req.Slug != "" && req.Slug != page.Slug {
		exists, err := s.pageRepo.Exists(ctx, &repository.QueryOptions{
			Where: map[string]any{"slug": req.Slug},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("单页别名已存在")
		}
	}

	page.Title = req.Title
	page.Slug = req.Slug
	page.LinkType = req.LinkType
	if page.LinkType == "" {
		page.LinkType = "page"
	}
	page.ExternalURL = req.ExternalURL
	page.Content = req.Content
	if req.Status != nil {
		page.Status = *req.Status
	}
	page.Sort = req.Sort

	if err := s.pageRepo.Update(ctx, page); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("单页别名已存在")
		}
		return err
	}
	return nil
}

func (s *PageService) Delete(ctx context.Context, id uint) error {
	if _, err := s.pageRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "单页不存在")
	}
	return s.pageRepo.Delete(ctx, id)
}

func (s *PageService) List(ctx context.Context, page, pageSize int, keyword string) ([]cmsmodel.CmsPage, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	}
	if keyword != "" {
		q.Search = map[string]string{"title": keyword, "slug": keyword}
	}
	return s.pageRepo.PageList(ctx, page, pageSize, q)
}
