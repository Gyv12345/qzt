package hrm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// employee.go HRM 员工档案。
// UserID 可选关联 sys_user(一人可既是系统用户又是员工);EmpNo 工号唯一。
// 部门/岗位变化通过 hrm_position_change 记录履历。

// 员工状态。
const (
	EmployeeStatusOnTrial int8 = 1 // 在职
	EmployeeStatusRegular int8 = 2 // 试用
	EmployeeStatusLeft    int8 = 3 // 离职
)

// 性别。
const (
	GenderUnknown int8 = 0 // 未知
	GenderMale    int8 = 1 // 男
	GenderFemale  int8 = 2 // 女
)

// HrmEmployee 员工档案。
type HrmEmployee struct {
	ID           uint               `json:"id" gorm:"primaryKey"`
	// 员工工号
	EmpNo        string             `json:"emp_no" gorm:"size:64;uniqueIndex;not null;comment:员工工号"`
	// 姓名
	Name         string             `json:"name" gorm:"size:128;not null;comment:姓名"`
	// 性别(0未知 1男 2女)
	Gender       int8               `json:"gender" gorm:"default:0;comment:性别(0未知 1男 2女)"`
	// 电话
	Phone        string             `json:"phone" gorm:"size:20;comment:电话"`
	// 邮箱
	Email        string             `json:"email" gorm:"size:128;comment:邮箱"`
	// 部门ID
	DepartmentID uint               `json:"department_id" gorm:"index;not null;comment:部门ID"`
	// 岗位ID
	PositionID   uint               `json:"position_id" gorm:"index;not null;comment:岗位ID"`
	// 关联系统用户ID
	UserID       *uint              `json:"user_id" gorm:"index;comment:关联系统用户ID"`
	// 入职日期
	EntryDate    xtime.DateTime     `json:"entry_date" gorm:"type:date;comment:入职日期"`
	// 离职日期
	ResignDate   xtime.NullDateTime `json:"resign_date" gorm:"type:date;comment:离职日期"`
	// 1在职 2试用 3离职
	Status       int8               `json:"status" gorm:"default:1;index;comment:1在职 2试用 3离职"`
	// 备注
	Remark       string             `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (HrmEmployee) TableName() string { return "hrm_employee" }
