package model

// SysDict 字典。用于枚举型业务数据（如客户状态：潜在/正式/流失），避免硬编码。
type SysDict struct {
	ID     uint           `json:"id" gorm:"primaryKey"`
	// 字典名称
	Name   string         `json:"name" gorm:"size:64;not null;comment:字典名称"`
	// 字典编码
	Code   string         `json:"code" gorm:"uniqueIndex;size:64;not null;comment:字典编码"`
	// 排序
	Sort   int            `json:"sort" gorm:"default:0;comment:排序"`
	// 1-启用 0-禁用
	Status int8           `json:"status" gorm:"default:1;comment:1-启用 0-禁用"`
	Remark string         `json:"remark" gorm:"size:255"`
	Items  []SysDictItem `json:"items,omitempty" gorm:"foreignKey:DictID"`
	BaseModel
}

func (SysDict) TableName() string {
	return "sys_dict"
}

// SysDictItem 字典项。
type SysDictItem struct {
	ID     uint   `json:"id" gorm:"primaryKey"`
	// 所属字典ID
	DictID uint   `json:"dict_id" gorm:"index;not null;comment:所属字典ID"`
	// 显示文本
	Label  string `json:"label" gorm:"size:128;not null;comment:显示文本"`
	// 存储值
	Value  string `json:"value" gorm:"size:128;not null;comment:存储值"`
	Sort   int    `json:"sort" gorm:"default:0"`
	// 1-启用 0-禁用
	Status int8   `json:"status" gorm:"default:1;comment:1-启用 0-禁用"`
	Remark string `json:"remark" gorm:"size:255"`
	BaseModel
}

func (SysDictItem) TableName() string {
	return "sys_dict_item"
}
