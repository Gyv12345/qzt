package service

import (
	"context"
	"errors"
	"strings"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xcryption"
	"gorm.io/gorm"
)

type UserService struct {
	userRepo *repository.UserRepo
	// 官网团队成员由「官网内容→官网首页配置→团队成员」精选决定,
	// 公开接口据此过滤,不能把全部系统用户暴露到官网。
	homepageModuleRepo  *repository.HomepageModuleRepo
	homepageFeatureRepo *repository.HomepageFeatureRepo
}

func NewUserService() *UserService {
	return &UserService{
		userRepo:            repository.NewUserRepo(),
		homepageModuleRepo:  repository.NewHomepageModuleRepo(),
		homepageFeatureRepo: repository.NewHomepageFeatureRepo(),
	}
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
		// Status 带 gorm:"default:1",零值(禁用)的 INSERT 会被 GORM 跳过、
		// 落库为默认启用——显式补写,保住"新建即禁用"语义。
		if status == 0 {
			if err := s.userRepo.UpdateStatus(ctx, user.ID, 0); err != nil {
				return err
			}
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
		return repository.NotFoundOr(err, "用户不存在")
	}

	// admin(id=1) 是系统根账户,防篡改硬保护:密码/状态/角色经由本接口一律不可
	// 变更——重置根账户密码即接管系统,禁用即锁死权限体系,而角色变更对持有
	// 代码级 RBAC 绕过的根账户没有任何合法收益。根账户改密只走个人中心
	// 「修改密码」(验旧密码)。资料字段(昵称/头像/邮箱等)不受限。
	// 判定口径是"真正变化"而非"字段存在":前端编辑表单会回填当前 status/role_ids,
	// 无变化的回填必须放行,否则根账户连改昵称都会被拦。
	if id == 1 && req.Password != "" {
		return errors.New("超级管理员密码仅可在个人中心修改")
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
	if id == 1 && statusChanged {
		return errors.New("超级管理员账户状态不可修改")
	}
	if id == 1 && rolesChanged {
		return errors.New("超级管理员账户角色不可修改")
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

// ResetPasswordRequest 管理员重置用户密码请求(无需旧密码)。
type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6,max=72"`
}

// ResetPassword 管理员重置指定用户的密码(典型场景:用户忘记密码)。
// 与 Update 不同,只动密码一个字段,不会连带覆盖部门/上级/角色等资料。
// TokenVersion+1 撤销该用户已签发的全部会话;同时清除该用户名的登录失败
// 计数,避免"密码已重置却仍被失败锁拦 15 分钟"。
func (s *UserService) ResetPassword(ctx context.Context, id uint, req *ResetPasswordRequest) error {
	// admin(id=1) 是系统根账户:免旧密码重置其密码等于直接接管系统,任何操作者
	// (含其他超管)都不允许。根账户改密只走个人中心「修改密码」(需验旧密码)。
	if id == 1 {
		return errors.New("超级管理员密码仅可在个人中心修改,不可被重置")
	}
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "用户不存在")
	}

	hashed, err := xcryption.HashPassword(req.Password)
	if err != nil {
		return errors.New("密码加密失败")
	}
	user.Password = hashed
	user.TokenVersion++
	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}
	cache.ClearLoginFailByUsername(user.Username)
	return nil
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
		return repository.NotFoundOr(err, "用户不存在")
	}
	for _, r := range user.Roles {
		if r.Code == model.SuperAdminRoleCode {
			return errors.New("不能删除超级管理员")
		}
	}
	return s.userRepo.Delete(ctx, id)
}

func (s *UserService) List(ctx context.Context, page, pageSize int, keyword string) ([]model.SysUser, int64, error) {
	opts := &repository.QueryOptions{
		Order:    []string{"id ASC"},
		Preloads: []string{"Roles"},
	}
	if keyword != "" {
		opts.Search = map[string]string{"username": keyword, "nickname": keyword}
	}
	return s.userRepo.PageList(ctx, page, pageSize, opts)
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
		return nil, repository.NotFoundOr(err, "用户不存在")
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

// ListTeam 公开团队成员列表,只返回「官网内容→官网首页配置→团队成员」里
// 精选的用户,按精选顺序排列;板块关闭或未配置精选时返回空列表。
// 绝不回退为全量用户——公开接口不能把全部员工暴露到官网。
// 职位用其角色名拼接展示;邮箱/电话/密码等敏感字段一律不输出。
func (s *UserService) ListTeam(ctx context.Context) ([]PublicTeamMemberDTO, int64, error) {
	mod, err := s.homepageModuleRepo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"module": "team"},
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []PublicTeamMemberDTO{}, 0, nil
		}
		return nil, 0, err
	}
	if !mod.Enabled {
		return []PublicTeamMemberDTO{}, 0, nil
	}

	features, err := s.homepageFeatureRepo.ListByModule(ctx, "team")
	if err != nil {
		return nil, 0, err
	}
	if len(features) == 0 {
		return []PublicTeamMemberDTO{}, 0, nil
	}
	ids := make([]uint, 0, len(features))
	for _, f := range features {
		ids = append(ids, f.ItemID)
	}

	// 精选里可能混入已停用/已删除的成员,按 status=1 过滤后按精选顺序重排
	users, err := s.userRepo.List(ctx, &repository.QueryOptions{
		Where:    map[string]any{"status": 1},
		Conds:    []repository.Cond{{Query: "id IN ?", Args: []any{ids}}},
		Preloads: []string{"Roles"},
	})
	if err != nil {
		return nil, 0, err
	}
	byID := make(map[uint]*model.SysUser, len(users))
	for i := range users {
		byID[users[i].ID] = &users[i]
	}
	out := make([]PublicTeamMemberDTO, 0, len(ids))
	for _, id := range ids {
		u, ok := byID[id]
		if !ok {
			continue
		}
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
	return out, int64(len(out)), nil
}
