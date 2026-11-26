package repository

import (
	"context"

	mpmodel "qzt-go-server/internal/model/mp"
)

// mp_account.go 公众号账号 repository(mp 运营中心,docs/sql/mp_ops.sql)。

// MpAccountRepo 公众号账号 repository。
type MpAccountRepo struct {
	BaseRepo[mpmodel.Account]
}

func NewMpAccountRepo() *MpAccountRepo { return &MpAccountRepo{} }

// ListEnabled 启用中的账号(文章创作页账号下拉用)。
func (r *MpAccountRepo) ListEnabled(ctx context.Context) ([]mpmodel.Account, error) {
	return r.List(ctx, &QueryOptions{
		Where: map[string]any{"enabled": 1},
		Order: []string{"id ASC"},
	})
}
