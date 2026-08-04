package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// position_change.go 员工变更履历 repository。

type PositionChangeRepo struct {
	repository.BaseRepo[hrmmodel.HrmPositionChange]
}

func NewPositionChangeRepo() *PositionChangeRepo { return &PositionChangeRepo{} }

// ListByEmployee 按员工列变更履历(时间倒序)。
func (r *PositionChangeRepo) ListByEmployee(ctx context.Context, employeeID uint) ([]hrmmodel.HrmPositionChange, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"employee_id": employeeID},
		Order: []string{"id DESC"},
	})
}

// DeleteByEmployee 硬删除某员工的全部履历(员工删除时级联)。
func (r *PositionChangeRepo) DeleteByEmployee(ctx context.Context, employeeID uint) error {
	return repoDB(ctx).Unscoped().Where("employee_id = ?", employeeID).Delete(&hrmmodel.HrmPositionChange{}).Error
}
