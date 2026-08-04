package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// position.go 岗位 repository。
// 含 ListByDepartment/HasEmployees 供级联查询与删除校验。

type PositionRepo struct {
	repository.BaseRepo[hrmmodel.HrmPosition]
}

func NewPositionRepo() *PositionRepo { return &PositionRepo{} }

// Update 覆写泛型版本,只更新业务字段。
func (r *PositionRepo) Update(ctx context.Context, m *hrmmodel.HrmPosition) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Code", "DepartmentID", "Sort", "Status", "Remark")
}

// ListByDepartment 按部门列岗位。
func (r *PositionRepo) ListByDepartment(ctx context.Context, deptID uint) ([]hrmmodel.HrmPosition, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"department_id": deptID},
		Order: []string{"sort ASC", "id ASC"},
	})
}

// ListEnabled 列出所有启用岗位(下拉用)。
func (r *PositionRepo) ListEnabled(ctx context.Context) ([]hrmmodel.HrmPosition, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"status": 1},
		Order: []string{"sort ASC", "id ASC"},
	})
}

// HasEmployees 岗位下是否有员工(删除校验用)。
func (r *PositionRepo) HasEmployees(ctx context.Context, positionID uint) (bool, error) {
	db := repoDB(ctx).Model(&hrmmodel.HrmEmployee{}).Where("position_id = ?", positionID)
	var n int64
	if err := db.Count(&n).Error; err != nil {
		return false, err
	}
	return n > 0, nil
}
