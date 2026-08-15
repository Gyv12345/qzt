package service

import (
	"context"
	"errors"
	"time"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/pkg/xtime"
)

// employee.go 员工档案服务:CRUD + 工号唯一性 + 部门/岗位变更自动写履历。
// 变更类型(字典 POSITION_CHANGE_TYPE):HIRE 入职/TRANSFER 调岗/DEPT_MOVE 调部门/RESIGN 离职。

// 变更类型常量(对应字典 POSITION_CHANGE_TYPE)。
const (
	ChangeTypeHire      = "HIRE"      // 入职
	ChangeTypeTransfer  = "TRANSFER"  // 调岗
	ChangeTypeDeptMove  = "DEPT_MOVE" // 调部门
	ChangeTypeResign    = "RESIGN"    // 离职
)

// EmployeeService 员工档案服务。
type EmployeeService struct {
	repo    *hrrepo.EmployeeRepo
	changes *hrrepo.PositionChangeRepo
}

func NewEmployeeService() *EmployeeService {
	return &EmployeeService{
		repo:    hrrepo.NewEmployeeRepo(),
		changes: hrrepo.NewPositionChangeRepo(),
	}
}

// CreateEmployeeRequest 创建员工请求。
type CreateEmployeeRequest struct {
	EmpNo        string `json:"emp_no" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Gender       int8   `json:"gender"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	DepartmentID uint   `json:"department_id" binding:"required"`
	PositionID   uint   `json:"position_id" binding:"required"`
	UserID       *uint  `json:"user_id"`
	EntryDate    string `json:"entry_date"`
	Status       int8   `json:"status"`
	Remark       string `json:"remark"`
}

// Create 创建员工(写一条入职履历)。
func (s *EmployeeService) Create(ctx context.Context, req *CreateEmployeeRequest, operatorID uint) (*hrmmodel.HrmEmployee, error) {
	// 工号唯一性预检
	exists, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"emp_no": req.EmpNo}})
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("员工工号已存在")
	}
	status := req.Status
	if status == 0 {
		status = hrmmodel.EmployeeStatusRegular
	}
	emp := &hrmmodel.HrmEmployee{
		EmpNo:        req.EmpNo,
		Name:         req.Name,
		Gender:       req.Gender,
		Phone:        req.Phone,
		Email:        req.Email,
		DepartmentID: req.DepartmentID,
		PositionID:   req.PositionID,
		UserID:       req.UserID,
		Status:       status,
		Remark:       req.Remark,
	}
	if req.EntryDate != "" {
		t, err := parseDate(req.EntryDate)
		if err != nil {
			return nil, errors.New("入职日期格式应为 yyyy-MM-dd")
		}
		emp.EntryDate = t
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, emp); err != nil {
			return err
		}
		// 入职履历
		deptID := emp.DepartmentID
		posID := emp.PositionID
		return s.changes.Create(ctx, &hrmmodel.HrmPositionChange{
			EmployeeID:       emp.ID,
			ToDepartmentID:   &deptID,
			ToPositionID:     &posID,
			ChangeType:       ChangeTypeHire,
			OperatorID:       operatorID,
		})
	})
	if err != nil {
		return nil, err
	}
	return emp, nil
}

// GetByID 员工详情。
func (s *EmployeeService) GetByID(ctx context.Context, id uint) (*hrmmodel.HrmEmployee, error) {
	emp, err := s.repo.GetByID(ctx, id)
	return emp, repository.NotFoundOr(err, "员工不存在")
}

// UpdateEmployeeRequest 更新员工请求。
type UpdateEmployeeRequest struct {
	EmpNo        string `json:"emp_no" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Gender       int8   `json:"gender"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	DepartmentID uint   `json:"department_id" binding:"required"`
	PositionID   uint   `json:"position_id" binding:"required"`
	UserID       *uint  `json:"user_id"`
	EntryDate    string `json:"entry_date"`
	ResignDate   string `json:"resign_date"`
	Status       int8   `json:"status"`
	Remark       string `json:"remark"`
}

// Update 更新员工(部门/岗位变化或状态转离职时自动写履历)。
func (s *EmployeeService) Update(ctx context.Context, id uint, req *UpdateEmployeeRequest, operatorID uint) error {
	emp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "员工不存在")
	}
	// 工号唯一性(排除自身)
	if req.EmpNo != emp.EmpNo {
		exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
			Conds: []repository.Cond{{Query: "emp_no = ? AND id != ?", Args: []any{req.EmpNo, id}}},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("员工工号已存在")
		}
	}

	// 记录变更前的部门/岗位/状态
	oldDept, oldPos, oldStatus := emp.DepartmentID, emp.PositionID, emp.Status

	// 解析日期
	if req.EntryDate != "" {
		t, err := parseDate(req.EntryDate)
		if err != nil {
			return errors.New("入职日期格式应为 yyyy-MM-dd")
		}
		emp.EntryDate = t
	}
	if req.ResignDate != "" {
		t, err := parseDate(req.ResignDate)
		if err != nil {
			return errors.New("离职日期格式应为 yyyy-MM-dd")
		}
		emp.ResignDate = xtime.NewNullDateTimeFromTime(t.Time())
	}

	emp.EmpNo = req.EmpNo
	emp.Name = req.Name
	emp.Gender = req.Gender
	emp.Phone = req.Phone
	emp.Email = req.Email
	emp.DepartmentID = req.DepartmentID
	emp.PositionID = req.PositionID
	emp.UserID = req.UserID
	emp.Status = req.Status
	emp.Remark = req.Remark

	// 判定变更类型(优先级:离职 > 部门变 > 岗位变)
	var changeType string
	var fromDept, toDept, fromPos, toPos *uint
	newDept, newPos := req.DepartmentID, req.PositionID
	if req.Status == hrmmodel.EmployeeStatusLeft && oldStatus != hrmmodel.EmployeeStatusLeft {
		changeType = ChangeTypeResign
	} else if newDept != oldDept {
		changeType = ChangeTypeDeptMove
		fromDept, toDept = &oldDept, &newDept
		fromPos, toPos = &oldPos, &newPos
	} else if newPos != oldPos {
		changeType = ChangeTypeTransfer
		fromPos, toPos = &oldPos, &newPos
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, emp); err != nil {
			return err
		}
		if changeType != "" {
			return s.changes.Create(ctx, &hrmmodel.HrmPositionChange{
				EmployeeID:       id,
				FromDepartmentID: fromDept,
				ToDepartmentID:   toDept,
				FromPositionID:   fromPos,
				ToPositionID:     toPos,
				ChangeType:       changeType,
				OperatorID:       operatorID,
			})
		}
		return nil
	})
}

// Delete 删除员工(连同履历硬删除,员工档案属审计类不留软删痕迹)。
func (s *EmployeeService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "员工不存在")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		// 删除变更履历(硬删除)
		if err := s.changes.DeleteByEmployee(ctx, id); err != nil {
			return err
		}
		return s.repo.HardDelete(ctx, id)
	})
}

// List 员工列表(分页 + 过滤)。
func (s *EmployeeService) List(ctx context.Context, page, pageSize int, keyword string, deptID, positionID uint, status int8) ([]hrmmodel.HrmEmployee, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, keyword, deptID, positionID, status)
}

// Changes 员工变更履历。
func (s *EmployeeService) Changes(ctx context.Context, employeeID uint) ([]hrmmodel.HrmPositionChange, error) {
	return s.changes.ListByEmployee(ctx, employeeID)
}

// parseDate 解析 yyyy-MM-dd 为 xtime.DateTime。
func parseDate(s string) (xtime.DateTime, error) {
	t, err := time.ParseInLocation(xtime.DateFormat, s, time.Local)
	if err != nil {
		return xtime.DateTime{}, err
	}
	return xtime.NewDateTime(t), nil
}
