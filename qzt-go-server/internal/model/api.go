package model

// SysAPI 接口注册表。每条记录对应一个后端路由，作为 Casbin 策略的 obj。
// 菜单(type=2 按钮)通过 sys_menu_api 关联到接口，授权菜单即授权其全部接口。
type SysAPI struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Path        string `json:"path" gorm:"size:255;not null"`
	Method      string `json:"method" gorm:"size:16;not null"`
	Group       string `json:"group" gorm:"size:64"`
	Description string `json:"description" gorm:"size:255"`
	BaseModel
}

func (SysAPI) TableName() string {
	return "sys_api"
}
