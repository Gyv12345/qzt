package service

import (
	"context"
	"errors"

	"gorm.io/gorm"
	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
	cmsrepo "qzt-go-server/internal/repository/cms"
)

// CategoryService 分类服务。
type CategoryService struct {
	categoryRepo *cmsrepo.CategoryRepo
	articleRepo  *cmsrepo.ArticleRepo
}

func NewCategoryService() *CategoryService {
	return &CategoryService{
		categoryRepo: cmsrepo.NewCategoryRepo(),
		articleRepo:  cmsrepo.NewArticleRepo(),
	}
}

// CreateCategoryRequest 创建分类请求。
type CreateCategoryRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Slug     string `json:"slug"`
	Sort     int    `json:"sort"`
	Status   *int8  `json:"status"`
	Remark   string `json:"remark"`
}

func (s *CategoryService) Create(ctx context.Context, req *CreateCategoryRequest) error {
	status := cmsmodel.StatusEnabled
	if req.Status != nil {
		status = *req.Status
	}

	// slug 唯一性预检（slug 非空时）
	if req.Slug != "" {
		exists, err := s.categoryRepo.Exists(ctx, &repository.QueryOptions{
			Where: map[string]interface{}{"slug": req.Slug},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("分类别名已存在")
		}
	}

	cat := &cmsmodel.CmsCategory{
		ParentID: req.ParentID,
		Name:     req.Name,
		Slug:     req.Slug,
		Sort:     req.Sort,
		Status:   status,
		Remark:   req.Remark,
	}
	if err := s.categoryRepo.Create(ctx, cat); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("分类别名已存在")
		}
		return err
	}
	return nil
}

func (s *CategoryService) GetByID(ctx context.Context, id uint) (*cmsmodel.CmsCategory, error) {
	cat, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "分类不存在")
	}
	return cat, nil
}

// UpdateCategoryRequest 更新分类请求。
type UpdateCategoryRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Slug     string `json:"slug"`
	Sort     int    `json:"sort"`
	Status   *int8  `json:"status"`
	Remark   string `json:"remark"`
}

func (s *CategoryService) Update(ctx context.Context, id uint, req *UpdateCategoryRequest) error {
	cat, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "分类不存在")
	}
	// 不能将自身设为父分类
	if req.ParentID == id {
		return errors.New("不能将自身设为父分类")
	}
	// slug 变更时做唯一性预检
	if req.Slug != "" && req.Slug != cat.Slug {
		exists, err := s.categoryRepo.Exists(ctx, &repository.QueryOptions{
			Where: map[string]interface{}{"slug": req.Slug},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("分类别名已存在")
		}
	}

	cat.ParentID = req.ParentID
	cat.Name = req.Name
	cat.Slug = req.Slug
	cat.Sort = req.Sort
	if req.Status != nil {
		cat.Status = *req.Status
	}
	cat.Remark = req.Remark

	if err := s.categoryRepo.Update(ctx, cat); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("分类别名已存在")
		}
		return err
	}
	return nil
}

func (s *CategoryService) Delete(ctx context.Context, id uint) error {
	if _, err := s.categoryRepo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "分类不存在")
	}
	// 校验无子分类
	hasChildren, err := s.categoryRepo.HasChildren(ctx, id)
	if err != nil {
		return err
	}
	if hasChildren {
		return errors.New("该分类下存在子分类，无法删除")
	}
	// 校验无关联文章
	hasArticles, err := s.articleRepo.Exists(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"category_id": id},
	})
	if err != nil {
		return err
	}
	if hasArticles {
		return errors.New("该分类下存在文章，无法删除")
	}
	return s.categoryRepo.Delete(ctx, id)
}

func (s *CategoryService) List(ctx context.Context, page, pageSize int, keyword string) ([]cmsmodel.CmsCategory, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword, "slug": keyword}
	}
	return s.categoryRepo.PageList(ctx, page, pageSize, q)
}

// ListAll 返回全部分类并构建为树。
func (s *CategoryService) ListAll(ctx context.Context) ([]*cmsmodel.CmsCategory, error) {
	list, err := s.categoryRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	return buildCategoryTree(list, 0), nil
}

// buildCategoryTree 将扁平分类列表构建为内存树。parentID=0 为根。
func buildCategoryTree(list []cmsmodel.CmsCategory, parentID uint) []*cmsmodel.CmsCategory {
	index := make(map[uint]*cmsmodel.CmsCategory, len(list))
	for i := range list {
		index[list[i].ID] = &list[i]
	}
	var roots []*cmsmodel.CmsCategory
	for i := range list {
		node := &list[i]
		if node.ParentID == parentID {
			roots = append(roots, node)
		} else if parent, ok := index[node.ParentID]; ok {
			parent.Children = append(parent.Children, node)
		}
	}
	return roots
}
