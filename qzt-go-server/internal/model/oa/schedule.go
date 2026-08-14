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
	// 日程单号
	ScheduleNo string         `json:"schedule_no" gorm:"size:64;uniqueIndex;not null;comment:日程单号"`
	// 标题
	Title      string         `json:"title" gorm:"size:200;not null;comment:标题"`
	// 类型(MEETING/TASK/REMINDER/OUT/OTHER)
	EventType  string         `json:"event_type" gorm:"size:16;not null;default:OTHER;index;comment:类型(MEETING/TASK/REMINDER/OUT/OTHER)"`
	// 开始时间
	StartTime  xtime.DateTime `json:"start_time" gorm:"type:datetime;not null;comment:开始时间"`
	// 结束时间
	EndTime    xtime.DateTime `json:"end_time" gorm:"type:datetime;not null;comment:结束时间"`
	// 地点
	Location   string         `json:"location" gorm:"size:200;comment:地点"`
	// 内容
	Content    string         `json:"content" gorm:"type:text;comment:内容"`
	// 提醒(NONE/MIN5/MIN15/HOUR1/DAY1)
	RemindType string         `json:"remind_type" gorm:"size:16;not null;default:NONE;comment:提醒(NONE/MIN5/MIN15/HOUR1/DAY1)"`
	// 状态(PENDING/DONE/CANCELED)
	Status     string         `json:"status" gorm:"size:16;not null;default:PENDING;index;comment:状态(PENDING/DONE/CANCELED)"`
	// 创建人ID
	CreatorID  uint           `json:"creator_id" gorm:"index;not null;comment:创建人ID"`
	base.BaseModel
}

func (OaSchedule) TableName() string { return "oa_schedule" }
