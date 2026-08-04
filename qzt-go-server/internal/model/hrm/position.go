package hrm

import "qzt-go-server/internal/model/base"

// position.go HRM 岗位管理。
// 一个岗位归属一个部门;软删除时 Code 改写为 del#id#原值 释放唯一索引。

// HrmPosition 岗位。
type HrmPosition struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	Name         string `json:"name" gorm:"size:128;not null;comment:岗位名称"`
	Code         string `json:"code" gorm:"size:64;uniqueIndex;comment:岗位编码"`
	DepartmentID uint   `json:"department_id" gorm:"index;not null;comment:所属部门ID"`
	Sort         int    `json:"sort" gorm:"default:0;comment:排序"`
	Status       int8   `json:"status" gorm:"default:1;comment:1正常 0禁用"`
	Remark       string `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (HrmPosition) TableName() string { return "hrm_position" }
