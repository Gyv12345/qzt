package service

import (
	"context"
	"errors"
	"strings"

	"qzt-go-server/internal/model"
	"qzt-go-server/pkg/xcryption"
	"qzt-go-server/internal/repository"
	"gorm.io/gorm"
)

type UserService struct {
	userRepo *repository.UserRepo
}

func NewUserService() *UserService {
	return &UserService{userRepo: repository.NewUserRepo()}
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6,max=72"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	DeptID   *uint  `json:"dept_id"`
	LeaderID *uint  `json:"leader_id"`
	Status   *int8  `json:"status"`
	RoleIDs  []uint `json:"role_ids"`
}

type UpdateUserRequest struct {
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Avatar   string `json:"avatar"`
	DeptID   *uint  `json:"dept_id"`
	LeaderID *uint  `json:"leader_id"`
	Status   *int8  `json:"status"`
	Password string `json:"password" binding:"omitempty,min=6,max=72"`
	RoleIDs  []uint `json:"role_ids"`
}

func (s *UserService) Create(ctx context.Context, req *CreateUserRequest) error {
	_, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err == nil {
		return errors.New("用户名已存在")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err // 真实 DB 错误，不当作"可创建"
	}

	hashed, err := xcryption.HashPassword(req.Password)
	if err != nil {
		return errors.New("密码加密失败")
	}

	status := int8(1)
	if req.Status != nil {
		status = *req.Status
	}

	user := &model.SysUser{
		Username: req.Username,
		Password: hashed,
		Nickname: req.Nickname,
		Email:    req.Email,
		Phone:    req.Phone,
		DeptID:   req.DeptID,
		LeaderID: req.LeaderID,
		Status:   status,
	}

	// 创建用户 + 分配角色 在同一事务内（中途失败整体回滚）
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.userRepo.Create(ctx, user); err != nil {
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				return errors.New("用户名已存在") // 唯一索引兜底（堵 TOCTOU 竞态）
			}
			return err
		}
		if len(req.RoleIDs) > 0 {
			return s.userRepo.SetRoles(ctx, user.ID, req.RoleIDs)
		}
		return nil
	})
}

func (s *UserService) GetByID(ctx context.Context, id uint) (*model.SysUser, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *UserService) Update(ctx context.Context, id uint, req *UpdateUserRequest) error {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "用户不存在")
	}

	// admin(id=1) 是系统根账户,必须始终持有超级管理员角色(id=1),
	// 防止经由此 Update 把超管角色摘掉导致权限体系锁死(与 Delete 的 id==1 保护呼应)。
	// 仅当请求带了角色字段(非 nil)才校验;不带则不动角色,避免普通改昵称被误拦。
	if id == 1 && req.RoleIDs != nil {
		hasSuperAdmin := false
		for _, rid := range req.RoleIDs {
			if rid == 1 {
				hasSuperAdmin = true
				break
			}
		}
		if !hasSuperAdmin {
			return errors.New("超级管理员账户必须保留超级管理员角色")
		}
	}

	// 先判断密码/状态/角色是否真正变化(基于 user 当前值,必须在下面赋值之前判断,
	// 否则 status 赋值后恒相等),再决定是否撤销该用户已签发的会话。
	passwordChanged := req.Password != ""
	statusChanged := req.Status != nil && *req.Status != user.Status
	rolesChanged := false
	if req.RoleIDs != nil {
		currentIDs := make(map[uint]struct{}, len(user.Roles))
		for _, r := range user.Roles {
			currentIDs[r.ID] = struct{}{}
		}
		if len(req.RoleIDs) != len(currentIDs) {
			rolesChanged = true
		} else {
			for _, rid := range req.RoleIDs {
				if _, ok := currentIDs[rid]; !ok {
					rolesChanged = true
					break
				}
			}
		}
	}

	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	user.DeptID = req.DeptID
	user.LeaderID = req.LeaderID
	if req.Status != nil {
		user.Status = *req.Status
	}
	if req.Password != "" {
		hashed, err := xcryption.HashPassword(req.Password)
		if err != nil {
			return errors.New("密码加密失败")
		}
		user.Password = hashed
	}
	// 仅当密码 / 状态 / 角色真正发生变化时,才使该用户已签发的 token 失效(会话撤销)。
	// 不能仅凭"请求带了这些字段"就 bump——前端编辑表单通常会回填当前 role_ids/status,
	// 否则每次编辑(哪怕只改昵称)都会踢出该用户,编辑自己时把自己登出。
	if passwordChanged || statusChanged || rolesChanged {
		user.TokenVersion++
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.userRepo.Update(ctx, user); err != nil {
			return err
		}
		if req.RoleIDs != nil {
			return s.userRepo.SetRoles(ctx, id, req.RoleIDs)
		}
		return nil
	})
}

func (s *UserService) Delete(ctx context.Context, id, currentUserID uint) error {
	// admin(id=1) 是系统根账户,无论角色如何变更都不可删除,防止权限体系锁死。
	if id == 1 {
		return errors.New("超级管理员账户不可删除")
	}
	if id == currentUserID {
		return errors.New("不能删除当前登录用户")
	}
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "用户不存在")
	}
	for _, r := range user.Roles {
		if r.Code == model.SuperAdminRoleCode {
			return errors.New("不能删除超级管理员")
		}
	}
	return s.userRepo.Delete(ctx, id)
}

func (s *UserService) List(ctx context.Context, page, pageSize int) ([]model.SysUser, int64, error) {
	return s.userRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{
		Order:    []string{"id DESC"},
		Preloads: []string{"Roles"},
	})
}

// UserOptionDTO 选人简表(只暴露选人必需字段,不含邮箱/电话等)。
type UserOptionDTO struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	DeptID   *uint  `json:"dept_id,omitempty"`
}

// ListOptions 用户简表(登录即可用):站内信收件人、转移负责人等选人场景。
// keyword 模糊匹配用户名/昵称;limit 由 repo 钳制在 1~100。
func (s *UserService) ListOptions(ctx context.Context, keyword string, limit int) ([]UserOptionDTO, error) {
	users, err := s.userRepo.SearchOptions(ctx, strings.TrimSpace(keyword), limit)
	if err != nil {
		return nil, err
	}
	out := make([]UserOptionDTO, 0, len(users))
	for _, u := range users {
		nickname := u.Nickname
		if nickname == "" {
			nickname = u.Username
		}
		out = append(out, UserOptionDTO{ID: u.ID, Username: u.Username, Nickname: nickname, DeptID: u.DeptID})
	}
	return out, nil
}

func (s *UserService) GetProfile(ctx context.Context, id uint) (*model.SysUser, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "用户不存在")
	}
	return user, nil
}

// ── 公开(免鉴权)接口 ──

// PublicTeamMemberDTO 公开团队成员视图。只暴露对外可展示字段,
// 绝不返回 password/token_version/email/phone/username 等敏感信息。
type PublicTeamMemberDTO struct {
	ID       uint   `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Position string `json:"position"` // 职位:取角色名(若无则为空)
}

// ListTeam 公开团队成员分页列表(只返回 status=正常 的用户)。
// 职位用其角色名拼接展示;邮箱/电话/密码等敏感字段一律不输出。
func (s *UserService) ListTeam(ctx context.Context, page, pageSize int) ([]PublicTeamMemberDTO, int64, error) {
	users, total, err := s.userRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{
		Where:    map[string]any{"status": 1},
		Preloads: []string{"Roles"},
		Order:    []string{"id ASC"},
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]PublicTeamMemberDTO, 0, len(users))
	for _, u := range users {
		position := ""
		if len(u.Roles) > 0 {
			names := make([]string, 0, len(u.Roles))
			for _, r := range u.Roles {
				names = append(names, r.Name)
			}
			position = strings.Join(names, "、")
		}
		nickname := u.Nickname
		if nickname == "" {
			nickname = u.Username
		}
		out = append(out, PublicTeamMemberDTO{
			ID: u.ID, Nickname: nickname, Avatar: u.Avatar, Position: position,
		})
	}
	return out, total, nil
}
