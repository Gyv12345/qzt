package hrm

import "qzt-go-server/internal/model/base"

// position_change.go HRM 员工部门/岗位变更履历。
// 由员工 service 在部门或岗位发生变化时自动写入。

// HrmPositionChange 员工变更履历。
type HrmPositionChange struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	// 员工ID
	EmployeeID     uint   `json:"employee_id" gorm:"index;not null;comment:员工ID"`
	// 原部门ID
	FromDepartmentID *uint `json:"from_department_id" gorm:"comment:原部门ID"`
	// 新部门ID
	ToDepartmentID   *uint `json:"to_department_id" gorm:"comment:新部门ID"`
	// 原岗位ID
	FromPositionID *uint  `json:"from_position_id" gorm:"comment:原岗位ID"`
	// 新岗位ID
	ToPositionID   *uint  `json:"to_position_id" gorm:"comment:新岗位ID"`
	// 变更类型(字典POSITION_CHANGE_TYPE)
	ChangeType     string `json:"change_type" gorm:"size:32;comment:变更类型(字典POSITION_CHANGE_TYPE)"`
	// 变更原因
	Reason         string `json:"reason" gorm:"size:500;comment:变更原因"`
	// 操作人ID
	OperatorID     uint   `json:"operator_id" gorm:"comment:操作人ID"`
	base.BaseModel
}

func (HrmPositionChange) TableName() string { return "hrm_position_change" }
