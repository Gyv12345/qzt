package model

// change_log.go 通用字段变更日志(多态:一个表管所有业务实体的字段变更)。

import "time"

// SysFieldChangeLog 字段变更日志(append-only,不软删除)。
type SysFieldChangeLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	BizType    string    `json:"biz_type" gorm:"size:32;index:idx_biz_resource;not null;comment:业务类型(CUSTOMER/LEAD/OPPORTUNITY/CONTRACT)"`
	ResourceID uint      `json:"resource_id" gorm:"index:idx_biz_resource;not null;comment:资源ID"`
	Field      string    `json:"field" gorm:"size:64;not null;comment:字段列名"`
	FieldLabel string    `json:"field_label" gorm:"size:64;comment:字段中文名"`
	OldValue   string    `json:"old_value" gorm:"type:text;comment:旧值"`
	NewValue   string    `json:"new_value" gorm:"type:text;comment:新值"`
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
