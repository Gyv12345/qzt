package model

import (
	"qzt-go-server/internal/model/base"
)

// BaseModel 所有业务表的公共字段。转引自 base 包，供 system 模块 model 共享。
// 业务子包(如 model/crm)应直接引用 base 包，避免循环引用。
type BaseModel = base.BaseModel

// CommonStatus 通用启用/禁用状态。
const (
	StatusDisabled int8 = 0 // 禁用
	StatusEnabled  int8 = 1 // 正常
)
