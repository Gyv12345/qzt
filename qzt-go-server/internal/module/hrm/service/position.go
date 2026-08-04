package service

import (
	"context"
	"errors"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrrepo "qzt-go-server/internal/repository/hrm"
)

// position.go 岗位服务:CRUD + 删除校验(有员工则拒绝)。

// PositionService 岗位服务。
type PositionService struct {
	repo *hrrepo.PositionRepo
}

func NewPositionService() *PositionService {
	return &PositionService{repo: hrrepo.NewPositionRepo()}
}

// CreatePositionRequest 创建岗位请求。
type CreatePositionRequest struct {
	Name         string `json:"name" binding:"required"`
	Code         string `json:"code" binding:"required"`
	DepartmentID uint   `json:"department_id" binding:"required"`
	Sort         int    `json:"sort"`
	Status       int8   `json:"status"`
	Remark       string `json:"remark"`
}

// Create 创建岗位。
func (s *PositionService) Create(ctx context.Context, req *CreatePositionRequest) (*hrmmodel.HrmPosition, error) {
	// Code 唯一性预检
	exists, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]interface{}{"code": req.Code}})
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("岗位编码已存在")
	}
	status := req.Status
	if status == 0 {
		status = 1
	}
	pos := &hrmmodel.HrmPosition{
		Name:         req.Name,
		Code:         req.Code,
		DepartmentID: req.DepartmentID,
		Sort:         req.Sort,
		Status:       status,
		Remark:       req.Remark,
	}
	if err := s.repo.Create(ctx, pos); err != nil {
		return nil, err
	}
	return pos, nil
}

// GetByID 岗位详情。
func (s *PositionService) GetByID(ctx context.Context, id uint) (*hrmmodel.HrmPosition, error) {
	pos, err := s.repo.GetByID(ctx, id)
	return pos, notFoundOr(err, "岗位不存在")
}

// UpdatePositionRequest 更新岗位请求。
type UpdatePositionRequest struct {
	Name         string `json:"name" binding:"required"`
	Code         string `json:"code" binding:"required"`
	DepartmentID uint   `json:"department_id" binding:"required"`
	Sort         int    `json:"sort"`
	Status       int8   `json:"status"`
	Remark       string `json:"remark"`
}

// Update 更新岗位。
func (s *PositionService) Update(ctx context.Context, id uint, req *UpdatePositionRequest) error {
	pos, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "岗位不存在")
	}
	// Code 唯一性(排除自身)
	if req.Code != pos.Code {
		exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
			Conds: []repository.Cond{{Query: "code = ? AND id != ?", Args: []interface{}{req.Code, id}}},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("岗位编码已存在")
		}
	}
	pos.Name = req.Name
	pos.Code = req.Code
	pos.DepartmentID = req.DepartmentID
	pos.Sort = req.Sort
	pos.Status = req.Status
	pos.Remark = req.Remark
	return s.repo.Update(ctx, pos)
}

// Delete 删除岗位(有员工则拒绝)。
func (s *PositionService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "岗位不存在")
	}
	has, err := s.repo.HasEmployees(ctx, id)
	if err != nil {
		return err
	}
	if has {
		return errors.New("岗位下存在员工,请先转移员工")
	}
	return s.repo.Delete(ctx, id)
}

// List 岗位列表(可选按部门/状态过滤)。
func (s *PositionService) List(ctx context.Context, deptID uint, status int8) ([]hrmmodel.HrmPosition, error) {
	q := &repository.QueryOptions{Order: []string{"sort ASC", "id ASC"}}
	where := map[string]interface{}{}
	if deptID > 0 {
		where["department_id"] = deptID
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.repo.List(ctx, q)
}

// ListEnabled 启用岗位列表(下拉用)。
func (s *PositionService) ListEnabled(ctx context.Context) ([]hrmmodel.HrmPosition, error) {
	return s.repo.ListEnabled(ctx)
}
