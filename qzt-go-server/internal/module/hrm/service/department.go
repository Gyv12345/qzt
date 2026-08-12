package service

import (
	"context"
	"errors"
	"fmt"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrrepo "qzt-go-server/internal/repository/hrm"
)

// department.go 部门服务:CRUD + 树构建 + 删除校验。
// 树采用全量列表 + 内存拼装 Children,部门量通常不大,无需递归查询。

// DepartmentService 部门服务。
type DepartmentService struct {
	repo *hrrepo.DepartmentRepo
}

func NewDepartmentService() *DepartmentService {
	return &DepartmentService{repo: hrrepo.NewDepartmentRepo()}
}

// CreateDepartmentRequest 创建部门请求。
type CreateDepartmentRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Code     string `json:"code" binding:"required"`
	Leader   *uint  `json:"leader_id"`
	Sort     int    `json:"sort"`
	Status   int8   `json:"status"`
}

// Create 创建部门。
func (s *DepartmentService) Create(ctx context.Context, req *CreateDepartmentRequest) (*hrmmodel.HrmDepartment, error) {
	// Code 唯一性预检
	exists, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"code": req.Code}})
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("部门编码已存在")
	}
	// 父部门存在性校验(根部门 ParentID=0 跳过)
	if req.ParentID > 0 {
		ok, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"id": req.ParentID}})
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, errors.New("父部门不存在")
		}
	}
	status := req.Status
	if status == 0 {
		status = 1
	}
	dept := &hrmmodel.HrmDepartment{
		ParentID: req.ParentID,
		Name:     req.Name,
		Code:     req.Code,
		Leader:   req.Leader,
		Sort:     req.Sort,
		Status:   status,
	}
	if err := s.repo.Create(ctx, dept); err != nil {
		return nil, err
	}
	return dept, nil
}

// GetByID 部门详情。
func (s *DepartmentService) GetByID(ctx context.Context, id uint) (*hrmmodel.HrmDepartment, error) {
	dept, err := s.repo.GetByID(ctx, id)
	return dept, notFoundOr(err, "部门不存在")
}

// UpdateDepartmentRequest 更新部门请求。
type UpdateDepartmentRequest struct {
	ParentID *uint  `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Code     string `json:"code" binding:"required"`
	Leader   *uint  `json:"leader_id"`
	Sort     int    `json:"sort"`
	Status   int8   `json:"status"`
}

// Update 更新部门。
func (s *DepartmentService) Update(ctx context.Context, id uint, req *UpdateDepartmentRequest) error {
	dept, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "部门不存在")
	}
	// Code 唯一性(排除自身)
	if req.Code != dept.Code {
		exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
			Conds: []repository.Cond{{Query: "code = ? AND id != ?", Args: []any{req.Code, id}}},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("部门编码已存在")
		}
	}
	// 不能将自身设为父部门,也不能设到自己的子孙节点(此处校验直接父级循环)
	if req.ParentID != nil {
		if *req.ParentID == id {
			return errors.New("不能将部门设为自身的子部门")
		}
		if *req.ParentID > 0 {
			ok, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"id": *req.ParentID}})
			if err != nil {
				return err
			}
			if !ok {
				return errors.New("父部门不存在")
			}
		}
		dept.ParentID = *req.ParentID
	}
	dept.Name = req.Name
	dept.Code = req.Code
	dept.Leader = req.Leader
	dept.Sort = req.Sort
	dept.Status = req.Status
	return s.repo.Update(ctx, dept)
}

// Delete 删除部门(有子部门或员工则拒绝)。
func (s *DepartmentService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "部门不存在")
	}
	n, err := s.repo.CountChildren(ctx, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("部门下存在 %d 个子部门,请先处理子部门", n)
	}
	has, err := s.repo.HasEmployees(ctx, id)
	if err != nil {
		return err
	}
	if has {
		return errors.New("部门下存在员工,请先转移员工")
	}
	return s.repo.Delete(ctx, id)
}

// List 部门列表(按 sort 排序,可选 keyword/status 过滤)。
func (s *DepartmentService) List(ctx context.Context, keyword string, status int8) ([]hrmmodel.HrmDepartment, error) {
	q := &repository.QueryOptions{Order: []string{"sort ASC", "id ASC"}}
	if status > 0 {
		q.Where = map[string]any{"status": status}
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	return s.repo.List(ctx, q)
}

// Tree 部门树(全量列表内存拼装 Children)。
func (s *DepartmentService) Tree(ctx context.Context) ([]hrmmodel.HrmDepartment, error) {
	list, err := s.List(ctx, "", 0)
	if err != nil {
		return nil, err
	}
	return buildDeptTree(list), nil
}

// buildDeptTree 将平铺的部门列表拼装为树(根节点 ParentID=0)。
func buildDeptTree(list []hrmmodel.HrmDepartment) []hrmmodel.HrmDepartment {
	byID := make(map[uint]*hrmmodel.HrmDepartment, len(list))
	roots := make([]hrmmodel.HrmDepartment, 0)
	// 先建立索引(用可寻址副本)
	addr := make([]hrmmodel.HrmDepartment, len(list))
	for i := range list {
		addr[i] = list[i]
		byID[addr[i].ID] = &addr[i]
	}
	for i := range addr {
		d := &addr[i]
		if d.ParentID == 0 {
			roots = append(roots, *d)
		} else if parent, ok := byID[d.ParentID]; ok {
			parent.Children = append(parent.Children, d)
		}
	}
	// roots 里存的是副本,Children 引用在 addr 中;重建 roots 使其携带子节点
	out := make([]hrmmodel.HrmDepartment, 0, len(roots))
	for i := range roots {
		out = append(out, *byID[roots[i].ID])
	}
	return out
}
