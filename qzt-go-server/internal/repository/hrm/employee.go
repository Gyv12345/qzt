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

// WecomEmpMap 构建 wecomUserID → employeeID 映射(企微打卡同步用,批量查询避免 N+1)。
// 链路: sys_user.wecom_user_id → sys_user.id → hrm_employee.user_id → hrm_employee.id。
// 涉及 sys_user 跨表查询,收口在 repository 层。
func WecomEmpMap(ctx context.Context) (map[string]uint, error) {
	db := repository.DBFrom(ctx)

	// 1. 绑定了 wecom_user_id 的 sys_user
	type su struct {
		ID          uint
		WecomUserID string
	}
	var users []su
	if err := db.Table("sys_user").
		Select("id, wecom_user_id").
		Where("wecom_user_id IS NOT NULL AND wecom_user_id <> '' AND deleted_at IS NULL").
		Find(&users).Error; err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return map[string]uint{}, nil
	}

	wecomToUser := make(map[string]uint, len(users))
	userIDs := make([]uint, 0, len(users))
	for _, u := range users {
		wecomToUser[u.WecomUserID] = u.ID
		userIDs = append(userIDs, u.ID)
	}

	// 2. 批量查 hrm_employee(user_id → employee.id)
	type emp struct {
		ID     uint
		UserID *uint
	}
	var emps []emp
	if err := db.Table("hrm_employee").
		Select("id, user_id").
		Where("user_id IN ? AND deleted_at IS NULL", userIDs).
		Find(&emps).Error; err != nil {
		return nil, err
	}
	userToEmp := make(map[uint]uint, len(emps))
	for _, e := range emps {
		if e.UserID != nil {
			userToEmp[*e.UserID] = e.ID
		}
	}

	// 3. wecomUserID → empID
	result := make(map[string]uint)
	for wecomID, uid := range wecomToUser {
		if empID, ok := userToEmp[uid]; ok {
			result[wecomID] = empID
		}
	}
	return result, nil
}
