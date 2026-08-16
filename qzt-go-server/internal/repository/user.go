package repository

import (
	"context"

	"gorm.io/gorm"
	"qzt-go-server/internal/model"
)

type UserRepo struct {
	BaseRepo[model.SysUser]
}

func NewUserRepo() *UserRepo {
	return &UserRepo{}
}

// GetByID overrides the generic version to preload Roles.
func (d *UserRepo) GetByID(ctx context.Context, id uint) (*model.SysUser, error) {
	return d.BaseRepo.GetByID(ctx, id, "Roles")
}

func (d *UserRepo) GetByUsername(ctx context.Context, username string) (*model.SysUser, error) {
	var user model.SysUser
	if err := dbFrom(ctx).Preload("Roles").Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetTokenVersion returns the user's current token version (session revocation).
func (d *UserRepo) GetTokenVersion(ctx context.Context, id uint) (int, error) {
	var user model.SysUser
	if err := dbFrom(ctx).Select("token_version").First(&user, id).Error; err != nil {
		return 0, err
	}
	return user.TokenVersion, nil
}

// Update writes only base columns; Roles is managed by SetRoles.
func (d *UserRepo) Update(ctx context.Context, user *model.SysUser) error {
	return d.BaseRepo.Update(ctx, user, "Nickname", "DeptID", "LeaderID", "Email", "Phone", "Avatar", "Status", "Password", "TokenVersion", "WecomUserID")
}

// UpdateStatus 显式更新账号状态。
// SysUser.Status 带 gorm:"default:1",零值(禁用)在 Create 的 INSERT 中会被
// GORM 跳过、落库为默认 1——"新建即禁用"必须经本方法显式补写。
func (d *UserRepo) UpdateStatus(ctx context.Context, id uint, status int8) error {
	return d.BaseRepo.Update(ctx, &model.SysUser{ID: id, Status: status}, "Status")
}

// GetByWecomUserID 按企业微信 UserID 查找用户(扫码登录用)。找不到返回 gorm.ErrRecordNotFound。
func (d *UserRepo) GetByWecomUserID(ctx context.Context, wecomUserID string) (*model.SysUser, error) {
	var user model.SysUser
	if err := dbFrom(ctx).Preload("Roles").Where("wecom_user_id = ?", wecomUserID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// SearchOptions 用户简表检索:仅 status=正常 用户,按用户名/昵称模糊匹配,
// 只 Select 选人必需字段(id/username/nickname/dept_id),供站内信收件人、
// 转移负责人等登录即可用的选人场景。keyword 参数化绑定,limit 由服务端钳制。
func (d *UserRepo) SearchOptions(ctx context.Context, keyword string, limit int) ([]model.SysUser, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	q := dbFrom(ctx).Model(&model.SysUser{}).
		Select("id", "username", "nickname", "dept_id").
		Where("status = ?", 1).
		Order("id ASC")
	if keyword != "" {
		kw := "%" + keyword + "%"
		q = q.Where("username LIKE ? OR nickname LIKE ?", kw, kw)
	}
	var users []model.SysUser
	if err := q.Limit(limit).Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// Delete soft-deletes the user, clears its role associations (sys_user_role),
// and mangles the username so the unique index is freed — letting the same
// username be reused later. The soft-deleted row is kept for audit.
func (d *UserRepo) Delete(ctx context.Context, id uint) error {
	return Transaction(ctx, func(ctx context.Context) error {
		if err := dbFrom(ctx).Model(&model.SysUser{}).Where("id = ?", id).
			Update("username", gorm.Expr("CONCAT('del#', id, '#', LEFT(username, 40))")).Error; err != nil {
			return err
		}
		return dbFrom(ctx).Select("Roles").Delete(&model.SysUser{ID: id}).Error
	})
}

func (d *UserRepo) SetRoles(ctx context.Context, userID uint, roleIDs []uint) error {
	user := &model.SysUser{ID: userID}
	var roles []model.SysRole
	for _, id := range roleIDs {
		roles = append(roles, model.SysRole{ID: id})
	}
	return dbFrom(ctx).Model(user).Association("Roles").Replace(roles)
}
