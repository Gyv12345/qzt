package service

import (
	"context"
	"errors"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
)

// warehouse.go 仓库服务:CRUD + 下拉。

// WarehouseService 仓库服务。
type WarehouseService struct {
	repo *psirepo.WarehouseRepo
}

func NewWarehouseService() *WarehouseService {
	return &WarehouseService{repo: psirepo.NewWarehouseRepo()}
}

// CreateWarehouseRequest 创建仓库请求。
type CreateWarehouseRequest struct {
	Code      string `json:"code" binding:"required"`
	Name      string `json:"name" binding:"required"`
	Address   string `json:"address"`
	ManagerID *uint  `json:"manager_id"`
	Phone     string `json:"phone"`
	Sort      int    `json:"sort"`
	Status    *int8  `json:"status"`
	IsDefault *int8  `json:"is_default"`
	Remark    string `json:"remark"`
}

// Create 创建仓库(默认 status=启用)。
func (s *WarehouseService) Create(ctx context.Context, req *CreateWarehouseRequest) (*psimodel.PsiWarehouse, error) {
	wh := &psimodel.PsiWarehouse{
		Code: req.Code, Name: req.Name, Address: req.Address, ManagerID: req.ManagerID,
		Phone: req.Phone, Sort: req.Sort, Status: psimodel.StatusEnabled, Remark: req.Remark,
	}
	if req.Status != nil {
		wh.Status = *req.Status
	}
	if req.IsDefault != nil {
		wh.IsDefault = *req.IsDefault
	}
	if err := s.repo.Create(ctx, wh); err != nil {
		return nil, err
	}
	return wh, nil
}

// GetByID 仓库详情。
func (s *WarehouseService) GetByID(ctx context.Context, id uint) (*psimodel.PsiWarehouse, error) {
	wh, err := s.repo.GetByID(ctx, id)
	return wh, notFoundOr(err, "仓库不存在")
}

// UpdateWarehouseRequest 更新仓库请求。
type UpdateWarehouseRequest struct {
	Code      string `json:"code" binding:"required"`
	Name      string `json:"name" binding:"required"`
	Address   string `json:"address"`
	ManagerID *uint  `json:"manager_id"`
	Phone     string `json:"phone"`
	Sort      int    `json:"sort"`
	Status    *int8  `json:"status"`
	IsDefault *int8  `json:"is_default"`
	Remark    string `json:"remark"`
}

// Update 更新仓库。
func (s *WarehouseService) Update(ctx context.Context, id uint, req *UpdateWarehouseRequest) error {
	wh, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "仓库不存在")
	}
	wh.Code = req.Code
	wh.Name = req.Name
	wh.Address = req.Address
	wh.ManagerID = req.ManagerID
	wh.Phone = req.Phone
	wh.Sort = req.Sort
	if req.Status != nil {
		wh.Status = *req.Status
	}
	if req.IsDefault != nil {
		wh.IsDefault = *req.IsDefault
	}
	wh.Remark = req.Remark
	return s.repo.Update(ctx, wh)
}

// Delete 删除仓库(软删除)。默认仓库不允许删除。
func (s *WarehouseService) Delete(ctx context.Context, id uint) error {
	wh, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "仓库不存在")
	}
	if wh.IsDefault == 1 {
		return errors.New("默认仓库不允许删除")
	}
	return s.repo.Delete(ctx, id)
}

// List 仓库列表(分页 + keyword 名称模糊 + status 过滤)。
func (s *WarehouseService) List(ctx context.Context, page, pageSize int, keyword string, status int8) ([]psimodel.PsiWarehouse, int64, error) {
	q := &repository.QueryOptions{Order: []string{"sort ASC", "id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword, "code": keyword}
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// ListEnabled 列出启用的仓库(下拉用)。
func (s *WarehouseService) ListEnabled(ctx context.Context) ([]psimodel.PsiWarehouse, error) {
	return s.repo.ListEnabled(ctx)
}
