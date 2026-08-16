package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// department.go 部门 repository。
// 嵌入 BaseRepo[HrmDepartment];含 CountChildren/HasEmployees 供删除校验。

type DepartmentRepo struct {
	repository.BaseRepo[hrmmodel.HrmDepartment]
}

func NewDepartmentRepo() *DepartmentRepo { return &DepartmentRepo{} }

// Update 覆写泛型版本,只更新业务字段。
func (r *DepartmentRepo) Update(ctx context.Context, m *hrmmodel.HrmDepartment) error {
	return r.BaseRepo.Update(ctx, m, "ParentID", "Name", "Code", "Leader", "Sort", "Status")
}

// CountChildren 统计子部门数量(删除校验用)。
func (r *DepartmentRepo) CountChildren(ctx context.Context, parentID uint) (int64, error) {
	return r.Count(ctx, &repository.QueryOptions{
		Where: map[string]any{"parent_id": parentID},
	})
}

// HasEmployees 部门下是否有在职员工(删除校验用)。
func (r *DepartmentRepo) HasEmployees(ctx context.Context, deptID uint) (bool, error) {
	db := repoDB(ctx).Model(&hrmmodel.HrmEmployee{}).Where("department_id = ?", deptID)
	var n int64
	if err := db.Count(&n).Error; err != nil {
		return false, err
	}
	return n > 0, nil
}

// LeaderID 查在职部门负责人的用户 ID(部门不存在/禁用/未设负责人返回 nil)。
// 审批人解析(DEPT_HEAD:提交人 → 部门 → 负责人)用。
func (r *DepartmentRepo) LeaderID(ctx context.Context, deptID uint) *uint {
	var leaderID *uint
	repoDB(ctx).Table("hrm_department").Where("id = ? AND status = 1", deptID).Select("leader").Scan(&leaderID)
	return leaderID
}
