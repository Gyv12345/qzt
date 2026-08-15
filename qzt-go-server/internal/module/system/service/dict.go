package service

import (
	"context"
	"errors"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
	"gorm.io/gorm"
)

// DictService 字典服务。
type DictService struct {
	dictRepo *repository.DictRepo
}

func NewDictService() *DictService {
	return &DictService{dictRepo: repository.NewDictRepo()}
}

// CreateDictRequest 创建字典请求。
type CreateDictRequest struct {
	Name   string             `json:"name" binding:"required"`
	Code   string             `json:"code" binding:"required"`
	Status *int8              `json:"status"`
	Remark string             `json:"remark"`
	Items  []CreateDictItem   `json:"items"`
}

// CreateDictItem 字典项。
type CreateDictItem struct {
	Label  string `json:"label" binding:"required"`
	Value  string `json:"value" binding:"required"`
	Sort   int    `json:"sort"`
	Status *int8  `json:"status"`
	Remark string `json:"remark"`
}

func (s *DictService) Create(ctx context.Context, req *CreateDictRequest) error {
	// 编码唯一性预检
	exists, err := s.dictRepo.Exists(ctx, &repository.QueryOptions{
		Where: map[string]any{"code": req.Code},
	})
	if err != nil {
		return err
	}
	if exists {
		return errors.New("字典编码已存在")
	}

	status := model.StatusEnabled
	if req.Status != nil {
		status = *req.Status
	}
	dict := &model.SysDict{
		Name:   req.Name,
		Code:   req.Code,
		Status: status,
		Remark: req.Remark,
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.dictRepo.Create(ctx, dict); err != nil {
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				return errors.New("字典编码已存在")
			}
			return err
		}
		if len(req.Items) > 0 {
			items := make([]model.SysDictItem, 0, len(req.Items))
			for _, it := range req.Items {
				st := model.StatusEnabled
				if it.Status != nil {
					st = *it.Status
				}
				items = append(items, model.SysDictItem{
					DictID: dict.ID,
					Label:  it.Label,
					Value:  it.Value,
					Sort:   it.Sort,
					Status: st,
					Remark: it.Remark,
				})
			}
			return s.dictRepo.SetItems(ctx, dict.ID, items)
		}
		return nil
	})
}

func (s *DictService) GetByID(ctx context.Context, id uint) (*model.SysDict, error) {
	d, err := s.dictRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "字典不存在")
	}
	return d, nil
}

// UpdateDictRequest 更新字典请求。
type UpdateDictRequest struct {
	Name   string           `json:"name" binding:"required"`
	Code   string           `json:"code" binding:"required"`
	Status *int8            `json:"status"`
	Remark string           `json:"remark"`
	Items  []CreateDictItem `json:"items"`
}

func (s *DictService) Update(ctx context.Context, id uint, req *UpdateDictRequest) error {
	dict, err := s.dictRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "字典不存在")
	}
	dict.Name = req.Name
	dict.Code = req.Code
	if req.Status != nil {
		dict.Status = *req.Status
	}
	dict.Remark = req.Remark

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.dictRepo.Update(ctx, dict); err != nil {
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				return errors.New("字典编码已存在")
			}
			return err
		}
		if req.Items != nil {
			items := make([]model.SysDictItem, 0, len(req.Items))
			for _, it := range req.Items {
				st := model.StatusEnabled
				if it.Status != nil {
					st = *it.Status
				}
				items = append(items, model.SysDictItem{
					Label:  it.Label,
					Value:  it.Value,
					Sort:   it.Sort,
					Status: st,
					Remark: it.Remark,
				})
			}
			return s.dictRepo.SetItems(ctx, id, items)
		}
		return nil
	})
}

func (s *DictService) Delete(ctx context.Context, id uint) error {
	if _, err := s.dictRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "字典不存在")
	}
	return s.dictRepo.Delete(ctx, id)
}

func (s *DictService) List(ctx context.Context, page, pageSize int, keyword string) ([]model.SysDict, int64, error) {
	q := &repository.QueryOptions{
		Order:    []string{"sort ASC", "id ASC"},
		Preloads: []string{"Items"},
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword, "code": keyword}
	}
	return s.dictRepo.PageList(ctx, page, pageSize, q)
}

// ListAll 返回全部启用字典（含字典项），用于下拉选项。
func (s *DictService) ListAll(ctx context.Context) ([]model.SysDict, error) {
	return s.dictRepo.ListAll(ctx)
}
