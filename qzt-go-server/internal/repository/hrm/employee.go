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
	where := map[string]any{}
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
			Args:  []any{"%" + keyword + "%", "%" + keyword + "%"},
		}}
	}
	return r.BaseRepo.PageList(ctx, page, pageSize, q)
}

// GetByUserID 按关联系统用户ID查员工档案(user_id 已有索引)。用于打卡等场景从登录态推导 employee_id。
func (r *EmployeeRepo) GetByUserID(ctx context.Context, userID uint) (*hrmmodel.HrmEmployee, error) {
	var m hrmmodel.HrmEmployee
	err := repository.DBFrom(ctx).Where("user_id = ?", userID).First(&m).Error
	return &m, err
}
