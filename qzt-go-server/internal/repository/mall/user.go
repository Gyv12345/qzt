package mall

import (
	"context"

	"qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/repository"
)

// user.go 商城买家账号仓储(嵌泛型基座,事务经 context 传递)。

// UserRepo 买家账号仓储。
type UserRepo struct {
	repository.BaseRepo[mall.MallUser]
}

// NewUserRepo 构造。
func NewUserRepo() *UserRepo { return &UserRepo{} }

// GetByPhone 按手机号取买家(登录/查重)。
func (r *UserRepo) GetByPhone(ctx context.Context, phone string) (*mall.MallUser, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"phone": phone}})
}

// ExistsByPhoneAny 手机号是否被任何行占用(含软删)。唯一索引 uk_mall_user_phone
// 不豁免软删行,查重必须同口径,否则撞唯一键报 duplicated key。
func (r *UserRepo) ExistsByPhoneAny(ctx context.Context, phone string) (bool, error) {
	var n int64
	err := repository.DBFrom(ctx).Unscoped().Model(&mall.MallUser{}).
		Where("phone = ?", phone).
		Count(&n).Error
	return n > 0, err
}
