package base

import (
	"gorm.io/gorm"

	"qzt-go-server/pkg/xtime"
)

// BaseModel 所有业务表的公共字段：创建时间、更新时间、软删除。
// 软删除通过 gorm.DeletedAt 实现，查询默认自动过滤已删除记录。
// 放在独立的无依赖包 base 中，供 model 与各业务子包(如 model/crm)共享,避免循环引用。
// CreatedAt/UpdatedAt 用 xtime.DateTime,JSON 输出 "yyyy-MM-dd HH:mm:ss"。
// autoCreateTime/autoUpdateTime 确保 GORM 识别命名类型并自动填充。
type BaseModel struct {
	CreatedAt xtime.DateTime  `json:"created_at" gorm:"index;autoCreateTime"`
	UpdatedAt xtime.DateTime  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt  `json:"-" gorm:"index"`
}

// 通用启用/禁用状态。
const (
	StatusDisabled int8 = 0 // 禁用
	StatusEnabled  int8 = 1 // 正常
)
