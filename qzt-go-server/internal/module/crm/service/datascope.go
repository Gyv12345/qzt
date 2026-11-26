package service

import (
	"context"
	"errors"

	"qzt-go-server/internal/pkg/datascope"
)

// checkOwnerScope 校验当前用户是否有权访问指定负责人的单条数据。
// ownerID 为 nil 时按公海无主数据处理,由 CanAccessOwner 放行。
func checkOwnerScope(ctx context.Context, ownerID *uint) error {
	owner := uint(0)
	if ownerID != nil {
		owner = *ownerID
	}
	if !datascope.CanAccessOwner(ctx, owner) {
		return errors.New("无权访问该数据")
	}
	return nil
}
