package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

type OperationLogRepo struct {
	BaseRepo[model.SysOperationLog]
}

func NewOperationLogRepo() *OperationLogRepo {
	return &OperationLogRepo{}
}

// List/PageList/GetByID/Create come from BaseRepo. Time-range and keyword-OR
// filters are expressed via QueryOptions.Conds (see the service layer).

// Clear hard-deletes (Unscoped) all operation logs so "清空" truly empties the
// table. The explicit WHERE satisfies GORM's block-global-delete guard.
func (d *OperationLogRepo) Clear(ctx context.Context) error {
	return dbFrom(ctx).Unscoped().Where("1 = 1").Delete(&model.SysOperationLog{}).Error
}
