package model

// SuperAdminRoleCode 超级管理员角色编码，持有者绕过所有 RBAC 校验。
// 由 SeedData 创建，禁止复用或删除。与 config/rbac_model.conf 的 matcher 一致。
const SuperAdminRoleCode = "super_admin"

// 数据权限范围。
const (
	DataScopeAll         int8 = 1 // 全部数据
	DataScopeDept        int8 = 3 // 本部门数据
	DataScopeDeptAndSub  int8 = 4 // 本部门及子部门数据
	DataScopeSelf        int8 = 5 // 仅本人数据
)

// SysRole 角色。Code 全局唯一，作为 Casbin 的 subject。
type SysRole struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:64;not null"`
	Code      string    `json:"code" gorm:"uniqueIndex;size:64;not null"`
	Sort      int       `json:"sort" gorm:"default:0"`
	// 1-正常 0-禁用
	Status    int8      `json:"status" gorm:"default:1;comment:1-正常 0-禁用"`
	// 数据权限范围 1全部 3本部门 4本部门及子部门 5仅本人
	DataScope int8      `json:"data_scope" gorm:"not null;default:1;comment:数据权限范围 1全部 3本部门 4本部门及子部门 5仅本人"`
	Remark    string    `json:"remark" gorm:"size:255"`
	Menus     []SysMenu `json:"menus,omitempty" gorm:"many2many:sys_role_menu;"`
	BaseModel
}

func (SysRole) TableName() string {
	return "sys_role"
}
