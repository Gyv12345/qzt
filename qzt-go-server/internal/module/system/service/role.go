package service

import (
	"context"
	"errors"
	"fmt"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/repository"
	"gorm.io/gorm"
)

// dedupPolicies 对策略三元组 (sub,obj,act) 去重。
// casbin_rule 有唯一索引 (ptype,v0..v5),多个菜单可能共享同一 API,
// 若不去重,AddPolicies 会因重复键报 "duplicate entry"。
func dedupPolicies(policies [][]string) [][]string {
	if len(policies) == 0 {
		return policies
	}
	seen := make(map[string]struct{}, len(policies))
	out := make([][]string, 0, len(policies))
	for _, p := range policies {
		k := p[0] + "\x00" + p[1] + "\x00" + p[2]
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		out = append(out, p)
	}
	return out
}

type RoleService struct {
	roleRepo *repository.RoleRepo
}

func NewRoleService() *RoleService {
	return &RoleService{roleRepo: repository.NewRoleRepo()}
}

type CreateRoleRequest struct {
	Name   string `json:"name" binding:"required"`
	Code   string `json:"code" binding:"required"`
	Sort   int    `json:"sort"`
	Status *int8  `json:"status"`
	Remark string `json:"remark"`
}

type UpdateRoleRequest struct {
	Name      string `json:"name"`
	Sort      int    `json:"sort"`
	Status    *int8  `json:"status"`
	DataScope *int8  `json:"data_scope"`
	Remark    string `json:"remark"`
}

type SetRoleMenusRequest struct {
	MenuIDs []uint `json:"menu_ids" binding:"required"`
}

type SetRoleAPIsRequest struct {
	APIs []RoleAPIItem `json:"apis" binding:"required"`
}

type RoleAPIItem struct {
	Path   string `json:"path"`
	Method string `json:"method"`
}

func (s *RoleService) Create(ctx context.Context, req *CreateRoleRequest) error {
	if req.Code == model.SuperAdminRoleCode {
		return errors.New("该角色编码为系统保留，不可使用")
	}
	_, err := s.roleRepo.GetByCode(ctx, req.Code)
	if err == nil {
		return errors.New("角色编码已存在")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	status := int8(1)
	if req.Status != nil {
		status = *req.Status
	}

	role := &model.SysRole{
		Name:   req.Name,
		Code:   req.Code,
		Sort:   req.Sort,
		Status: status,
		Remark: req.Remark,
	}
	if err := s.roleRepo.Create(ctx, role); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errors.New("角色编码已存在")
		}
		return err
	}
	return nil
}

func (s *RoleService) GetByID(ctx context.Context, id uint) (*model.SysRole, error) {
	return s.roleRepo.GetByID(ctx, id)
}

func (s *RoleService) Update(ctx context.Context, id uint, req *UpdateRoleRequest) error {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "角色不存在")
	}

	// super_admin 角色(id=1)为系统内置:名称/排序/备注可改(展示性字段,无害),
	// 状态与数据权限不可改,防止内置角色被禁用或收窄造成权限体系异常
	// (与 Delete 的 id==1 保护呼应)。按"真正变化"判定,无变化的回填放行。
	if id == 1 {
		if req.Status != nil && *req.Status != role.Status {
			return errors.New("超级管理员角色状态不可修改")
		}
		if req.DataScope != nil && *req.DataScope != role.DataScope {
			return errors.New("超级管理员角色数据权限不可修改")
		}
	}

	if req.Name != "" {
		role.Name = req.Name
	}
	role.Sort = req.Sort
	if req.Status != nil {
		role.Status = *req.Status
	}
	if req.DataScope != nil {
		role.DataScope = *req.DataScope
	}
	if req.Remark != "" {
		role.Remark = req.Remark
	}
	return s.roleRepo.Update(ctx, role)
}

func (s *RoleService) Delete(ctx context.Context, id uint) error {
	// super_admin 角色(id=1)为系统内置,不可删除。
	if id == 1 {
		return errors.New("超级管理员角色不可删除")
	}
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "角色不存在")
	}
	if role.Code == model.SuperAdminRoleCode {
		return errors.New("系统内置超级管理员角色不可删除")
	}

	if err := s.roleRepo.Delete(ctx, id); err != nil {
		return err
	}
	if _, err := app.Enforcer.RemoveFilteredPolicy(0, role.Code); err != nil {
		app.Enforcer.LoadPolicy() // 回滚内存策略到 DB 状态
		return fmt.Errorf("清除角色权限策略失败: %w", err)
	}
	cache.ClearAllPermissionCache()
	return nil
}

func (s *RoleService) List(ctx context.Context, page, pageSize int) ([]model.SysRole, int64, error) {
	return s.roleRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	})
}

func (s *RoleService) ListAll(ctx context.Context) ([]model.SysRole, error) {
	return s.roleRepo.ListAll(ctx)
}

// SetMenus assigns menus to a role and rebuilds the role's Casbin policies from
// the menus' associated APIs. Casbin cannot share the DB transaction, so its
// operations are error-checked and, on failure, the in-memory policy is reloaded
// from DB to stay consistent.
func (s *RoleService) SetMenus(ctx context.Context, roleID uint, menuIDs []uint) error {
	if err := s.roleRepo.SetMenus(ctx, roleID, menuIDs); err != nil {
		return err
	}
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return err
	}

	if _, err := app.Enforcer.RemoveFilteredPolicy(0, role.Code); err != nil {
		app.Enforcer.LoadPolicy()
		return fmt.Errorf("清除旧权限策略失败: %w", err)
	}
	if len(menuIDs) > 0 {
		menus, err := repository.NewMenuRepo().GetByIDs(ctx, menuIDs)
		if err != nil {
			app.Enforcer.LoadPolicy()
			return err
		}
		var policies [][]string
		for _, m := range menus {
			for _, api := range m.APIs {
				policies = append(policies, []string{role.Code, api.Path, api.Method})
			}
		}
		policies = dedupPolicies(policies)
		if len(policies) > 0 {
			if _, err := app.Enforcer.AddPolicies(policies); err != nil {
				app.Enforcer.LoadPolicy()
				return fmt.Errorf("写入权限策略失败: %w", err)
			}
		}
	}
	if err := app.Enforcer.SavePolicy(); err != nil {
		app.Enforcer.LoadPolicy()
		return fmt.Errorf("保存权限策略失败: %w", err)
	}
	cache.ClearAllPermissionCache()
	return nil
}

func (s *RoleService) SetAPIs(ctx context.Context, roleID uint, apis []RoleAPIItem) error {
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return repository.NotFoundOr(err, "角色不存在")
	}

	if _, err := app.Enforcer.RemoveFilteredPolicy(0, role.Code); err != nil {
		app.Enforcer.LoadPolicy()
		return fmt.Errorf("清除旧权限策略失败: %w", err)
	}
	var policies [][]string
	for _, api := range apis {
		policies = append(policies, []string{role.Code, api.Path, api.Method})
	}
	policies = dedupPolicies(policies)
	if len(policies) > 0 {
		if _, err := app.Enforcer.AddPolicies(policies); err != nil {
			app.Enforcer.LoadPolicy()
			return fmt.Errorf("写入权限策略失败: %w", err)
		}
	}
	if err := app.Enforcer.SavePolicy(); err != nil {
		app.Enforcer.LoadPolicy()
		return fmt.Errorf("保存权限策略失败: %w", err)
	}
	cache.ClearAllPermissionCache()
	return nil
}

func (s *RoleService) GetAPIs(ctx context.Context, roleID uint) ([]RoleAPIItem, error) {
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return nil, repository.NotFoundOr(err, "角色不存在")
	}

	policies := app.Enforcer.GetFilteredPolicy(0, role.Code)
	items := make([]RoleAPIItem, 0, len(policies))
	for _, p := range policies {
		if len(p) >= 3 {
			items = append(items, RoleAPIItem{Path: p[1], Method: p[2]})
		}
	}
	return items, nil
}
