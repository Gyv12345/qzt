package model

// 菜单类型。
const (
	MenuTypeDir   int8 = 0 // 目录
	MenuTypeMenu  int8 = 1 // 菜单（页面）
	MenuTypeButton int8 = 2 // 按钮（权限点）
)

// SysMenu 菜单/权限节点。type=2 的按钮节点承载 permission 权限串，
// 并通过 sys_menu_api 关联到具体接口，Casbin 策略据此自动生成。
type SysMenu struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	ParentID   uint       `json:"parent_id" gorm:"default:0;comment:父菜单ID"`
	Name       string     `json:"name" gorm:"size:64;not null"`
	Path       string     `json:"path" gorm:"size:255"`
	Component  string     `json:"component" gorm:"size:255"`
	Icon       string     `json:"icon" gorm:"size:64"`
	Sort       int        `json:"sort" gorm:"default:0"`
	Type       int8       `json:"type" gorm:"comment:0-目录 1-菜单 2-按钮"`
	Permission string     `json:"permission" gorm:"size:128;comment:权限标识"`
	Visible    int8       `json:"visible" gorm:"default:1;comment:1-显示 0-隐藏"`
	Status     int8       `json:"status" gorm:"default:1;comment:1-正常 0-禁用"`
	APIs       []SysAPI   `json:"apis,omitempty" gorm:"many2many:sys_menu_api;"`
	Children   []*SysMenu `json:"children,omitempty" gorm:"-"`
	BaseModel
}

func (SysMenu) TableName() string {
	return "sys_menu"
}
