package oa

import (
	"qzt-go-server/internal/model/base"
)

// form_data.go OA 表单提交数据 model。
// 表由 docs/sql/oa_form.sql 建立,不用 AutoMigrate。

// OaFormData 用户提交的自定义表单数据。
type OaFormData struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	DataNo         string `json:"data_no" gorm:"size:64;uniqueIndex;not null;comment:数据单号"`
	TemplateID     uint   `json:"template_id" gorm:"index;not null;comment:表单模板ID"`
	TemplateKey    string `json:"template_key" gorm:"size:64;index;comment:表单标识(冗余,便于查询)"`
	TemplateName   string `json:"template_name" gorm:"size:100;comment:表单名称(冗余)"`
	SubmitterID    uint   `json:"submitter_id" gorm:"index;not null;comment:提交人ID"`
	DeptID         *uint  `json:"dept_id" gorm:"index;comment:部门ID"`
	FieldValues    string `json:"field_values" gorm:"type:longtext;comment:填写数据JSON"`
	ApprovalStatus string `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	base.BaseModel
}

func (OaFormData) TableName() string { return "oa_form_data" }
