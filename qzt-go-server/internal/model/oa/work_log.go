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
	// 日志单号
	LogNo     string         `json:"log_no" gorm:"size:64;uniqueIndex;not null;comment:日志单号"`
	// 类型(DAILY/WEEKLY/MONTHLY)
	LogType   string         `json:"log_type" gorm:"size:16;not null;default:DAILY;index;comment:类型(DAILY/WEEKLY/MONTHLY)"`
	// 日志日期
	LogDate   xtime.DateTime `json:"log_date" gorm:"type:date;not null;index;comment:日志日期"`
	// 今日完成
	Content   string         `json:"content" gorm:"type:text;comment:今日完成"`
	// 明日计划
	Plan      string         `json:"plan" gorm:"type:text;comment:明日计划"`
	// 遇到问题
	Problems  string         `json:"problems" gorm:"type:text;comment:遇到问题"`
	// 填写人ID
	CreatorID uint           `json:"creator_id" gorm:"index;not null;comment:填写人ID"`
	// 部门ID
	DeptID    *uint          `json:"dept_id" gorm:"index;comment:部门ID"`
	base.BaseModel
}

func (OaWorkLog) TableName() string { return "oa_work_log" }
