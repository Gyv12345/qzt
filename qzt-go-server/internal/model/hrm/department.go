package hrm

import "qzt-go-server/internal/model/base"

// department.go HRM 部门管理(树形结构)。
// 通过 ParentID 自引用构建组织架构树;负责人 Leader 为可选(关联 sys_user)。

// HrmDepartment 部门。
type HrmDepartment struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	// 父部门ID(0为根)
	ParentID uint   `json:"parent_id" gorm:"index;default:0;comment:父部门ID(0为根)"`
	// 部门名称
	Name     string `json:"name" gorm:"size:128;not null;comment:部门名称"`
	// 部门编码
	Code     string `json:"code" gorm:"size:64;uniqueIndex;comment:部门编码"`
	// 负责人ID(关联sys_user)
	Leader   *uint  `json:"leader_id" gorm:"comment:负责人ID(关联sys_user)"`
	// 排序
	Sort     int    `json:"sort" gorm:"default:0;comment:排序"`
	// 1正常 0禁用
	Status   int8   `json:"status" gorm:"default:1;comment:1正常 0禁用"`
	Children []*HrmDepartment `json:"children,omitempty" gorm:"-"`
	base.BaseModel
}

func (HrmDepartment) TableName() string { return "hrm_department" }
