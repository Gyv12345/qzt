package service

import (
	"context"
	"errors"

	"gorm.io/gorm"
	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
	cmsrepo "qzt-go-server/internal/repository/cms"
)

// TagService 标签服务。
type TagService struct {
	tagRepo *cmsrepo.TagRepo
}

func NewTagService() *TagService {
	return &TagService{tagRepo: cmsrepo.NewTagRepo()}
}

// CreateTagRequest 创建标签请求。
type CreateTagRequest struct {
	Name   string `json:"name" binding:"required"`
	Slug   string `json:"slug"`
	Sort   int    `json:"sort"`
	Status *int8  `json:"status"`
}

func (s *TagService) Create(ctx context.Context, req *CreateTagRequest) error {
	status := cmsmodel.StatusEnabled
	if req.Status != nil {
		status = *req.Status
	}

	if req.Slug != "" {
		exists, err := s.tagRepo.Exists(ctx, &repository.QueryOptions{
			Where: map[string]any{"slug": req.Slug},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("标签别名已存在")
		}
	}

	tag := &cmsmodel.CmsTag{
		Name:   req.Name,
		Slug:   req.Slug,
		Sort:   req.Sort,
		Status: status,
	}
	if err := s.tagRepo.Create(ctx, tag); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("标签别名已存在")
		}
		return err
	}
	return nil
}

func (s *TagService) GetByID(ctx context.Context, id uint) (*cmsmodel.CmsTag, error) {
	tag, err := s.tagRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "标签不存在")
	}
	return tag, nil
}

// UpdateTagRequest 更新标签请求。
type UpdateTagRequest struct {
	Name   string `json:"name" binding:"required"`
	Slug   string `json:"slug"`
	Sort   int    `json:"sort"`
	Status *int8  `json:"status"`
}

func (s *TagService) Update(ctx context.Context, id uint, req *UpdateTagRequest) error {
	tag, err := s.tagRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "标签不存在")
	}
	if req.Slug != "" && req.Slug != tag.Slug {
		exists, err := s.tagRepo.Exists(ctx, &repository.QueryOptions{
			Where: map[string]any{"slug": req.Slug},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("标签别名已存在")
		}
	}

	tag.Name = req.Name
	tag.Slug = req.Slug
	tag.Sort = req.Sort
	if req.Status != nil {
		tag.Status = *req.Status
	}

	if err := s.tagRepo.Update(ctx, tag); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("标签别名已存在")
		}
		return err
	}
	return nil
}

func (s *TagService) Delete(ctx context.Context, id uint) error {
	if _, err := s.tagRepo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "标签不存在")
	}
	return s.tagRepo.Delete(ctx, id)
}

func (s *TagService) List(ctx context.Context, page, pageSize int, keyword string) ([]cmsmodel.CmsTag, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword, "slug": keyword}
	}
	return s.tagRepo.PageList(ctx, page, pageSize, q)
}

// ListAll 返回全部启用标签，供下拉与前台。
func (s *TagService) ListAll(ctx context.Context) ([]cmsmodel.CmsTag, error) {
	return s.tagRepo.ListAll(ctx)
}
