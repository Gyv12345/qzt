package model

// SuperAdminRoleCode 超级管理员角色编码，持有者绕过所有 RBAC 校验。
// 由 SeedData 创建，禁止复用或删除。与 config/rbac_model.conf 的 matcher 一致。
const SuperAdminRoleCode = "super_admin"

// SysRole 角色。Code 全局唯一，作为 Casbin 的 subject。
type SysRole struct {
	ID     uint      `json:"id" gorm:"primaryKey"`
	Name   string    `json:"name" gorm:"size:64;not null"`
	Code   string    `json:"code" gorm:"uniqueIndex;size:64;not null"`
	Sort   int       `json:"sort" gorm:"default:0"`
	Status int8      `json:"status" gorm:"default:1;comment:1-正常 0-禁用"`
	Remark string    `json:"remark" gorm:"size:255"`
	Menus  []SysMenu `json:"menus,omitempty" gorm:"many2many:sys_role_menu;"`
	BaseModel
}

func (SysRole) TableName() string {
	return "sys_role"
}
