package model

// change_log.go 通用字段变更日志(多态:一个表管所有业务实体的字段变更)。

import "time"

// SysFieldChangeLog 字段变更日志(append-only,不软删除)。
type SysFieldChangeLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	// 业务类型(CUSTOMER/LEAD/OPPORTUNITY/CONTRACT)
	BizType    string    `json:"biz_type" gorm:"size:32;index:idx_biz_resource;not null;comment:业务类型(CUSTOMER/LEAD/OPPORTUNITY/CONTRACT)"`
	// 资源ID
	ResourceID uint      `json:"resource_id" gorm:"index:idx_biz_resource;not null;comment:资源ID"`
	// 字段列名
	Field      string    `json:"field" gorm:"size:64;not null;comment:字段列名"`
	// 字段中文名
	FieldLabel string    `json:"field_label" gorm:"size:64;comment:字段中文名"`
	// 旧值
	OldValue   string    `json:"old_value" gorm:"type:text;comment:旧值"`
	// 新值
	NewValue   string    `json:"new_value" gorm:"type:text;comment:新值"`
	// 操作人ID
	OperatorID uint      `json:"operator_id" gorm:"not null;comment:操作人ID"`
	CreatedAt  time.Time `json:"created_at" gorm:"index"`
}

func (SysFieldChangeLog) TableName() string { return "sys_field_change_log" }

// 业务类型常量
const (
	BizTypeCustomer    = "CUSTOMER"
	BizTypeLead        = "LEAD"
	BizTypeOpportunity = "OPPORTUNITY"
	BizTypeContract    = "CONTRACT"
)
