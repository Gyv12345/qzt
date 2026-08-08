package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// schedule.go OA 日程安排 model。
// 表由 docs/sql/oa_office.sql 建立,不用 AutoMigrate。

// OaSchedule 日程安排(个人日历事件)。
type OaSchedule struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	ScheduleNo string         `json:"schedule_no" gorm:"size:64;uniqueIndex;not null;comment:日程单号"`
	Title      string         `json:"title" gorm:"size:200;not null;comment:标题"`
	EventType  string         `json:"event_type" gorm:"size:16;not null;default:OTHER;index;comment:类型(MEETING/TASK/REMINDER/OUT/OTHER)"`
	StartTime  xtime.DateTime `json:"start_time" gorm:"type:datetime;not null;comment:开始时间"`
	EndTime    xtime.DateTime `json:"end_time" gorm:"type:datetime;not null;comment:结束时间"`
	Location   string         `json:"location" gorm:"size:200;comment:地点"`
	Content    string         `json:"content" gorm:"type:text;comment:内容"`
	RemindType string         `json:"remind_type" gorm:"size:16;not null;default:NONE;comment:提醒(NONE/MIN5/MIN15/HOUR1/DAY1)"`
	Status     string         `json:"status" gorm:"size:16;not null;default:PENDING;index;comment:状态(PENDING/DONE/CANCELED)"`
	CreatorID  uint           `json:"creator_id" gorm:"index;not null;comment:创建人ID"`
	base.BaseModel
}

func (OaSchedule) TableName() string { return "oa_schedule" }
