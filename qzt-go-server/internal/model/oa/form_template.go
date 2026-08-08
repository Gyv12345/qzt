package oa

import (
	"qzt-go-server/internal/model/base"
)

// form_template.go OA 自定义表单模板 model。
// 表由 docs/sql/oa_form.sql 建立,不用 AutoMigrate。

// OaFormTemplate 自定义表单模板(管理员定义,用户填写后提交审批)。
type OaFormTemplate struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	FormKey      string `json:"form_key" gorm:"size:64;uniqueIndex;not null;comment:表单标识(seal_apply)"`
	Name         string `json:"name" gorm:"size:100;not null;comment:表单名称(用印申请)"`
	Icon         string `json:"icon" gorm:"size:50;comment:图标"`
	Description  string `json:"description" gorm:"size:500;comment:描述"`
	FieldsConfig string `json:"fields_config" gorm:"type:longtext;comment:字段定义JSON"`
	Category     string `json:"category" gorm:"size:20;default:non-business;index;comment:分类(business/non-business)"`
	Status       int8   `json:"status" gorm:"default:1;index;comment:状态(0停用1启用)"`
	Sort         int    `json:"sort" gorm:"default:0;comment:排序"`
	base.BaseModel
}

func (OaFormTemplate) TableName() string { return "oa_form_template" }
