package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// employee.go 员工档案 repository。
// 分页过滤按 部门/岗位/状态/姓名工号模糊。

type EmployeeRepo struct {
	repository.BaseRepo[hrmmodel.HrmEmployee]
}

func NewEmployeeRepo() *EmployeeRepo { return &EmployeeRepo{} }

// Update 覆写泛型版本,只更新业务字段。
func (r *EmployeeRepo) Update(ctx context.Context, m *hrmmodel.HrmEmployee) error {
	return r.BaseRepo.Update(ctx, m,
		"EmpNo", "Name", "Gender", "Phone", "Email",
		"DepartmentID", "PositionID", "UserID", "EntryDate", "ResignDate", "Status", "Remark")
}

// PageList 分页查询(支持 keyword 姓名/工号模糊 + 部门/岗位/状态过滤)。
func (r *EmployeeRepo) PageList(ctx context.Context, page, pageSize int, keyword string, deptID, positionID uint, status int8) ([]hrmmodel.HrmEmployee, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]interface{}{}
	if deptID > 0 {
		where["department_id"] = deptID
	}
	if positionID > 0 {
		where["position_id"] = positionID
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	if keyword != "" {
		// 姓名 OR 工号模糊:用 Conds 表达 OR
		q.Conds = []repository.Cond{{
			Query: "name LIKE ? OR emp_no LIKE ?",
			Args:  []interface{}{"%" + keyword + "%", "%" + keyword + "%"},
		}}
	}
	return r.BaseRepo.PageList(ctx, page, pageSize, q)
}
