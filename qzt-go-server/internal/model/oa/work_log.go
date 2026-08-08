package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// work_log.go OA 工作日志 model。
// 表由 docs/sql/oa_office.sql 建立,不用 AutoMigrate。

// OaWorkLog 工作日志(日报/周报/月报)。
type OaWorkLog struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	LogNo     string         `json:"log_no" gorm:"size:64;uniqueIndex;not null;comment:日志单号"`
	LogType   string         `json:"log_type" gorm:"size:16;not null;default:DAILY;index;comment:类型(DAILY/WEEKLY/MONTHLY)"`
	LogDate   xtime.DateTime `json:"log_date" gorm:"type:date;not null;index;comment:日志日期"`
	Content   string         `json:"content" gorm:"type:text;comment:今日完成"`
	Plan      string         `json:"plan" gorm:"type:text;comment:明日计划"`
	Problems  string         `json:"problems" gorm:"type:text;comment:遇到问题"`
	CreatorID uint           `json:"creator_id" gorm:"index;not null;comment:填写人ID"`
	DeptID    *uint          `json:"dept_id" gorm:"index;comment:部门ID"`
	base.BaseModel
}

func (OaWorkLog) TableName() string { return "oa_work_log" }
