package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// meeting_booking.go OA 会议预订 model。
// 表由 docs/sql/oa_office.sql 建立,不用 AutoMigrate。

// OaMeetingBooking 会议预订(需审批)。
type OaMeetingBooking struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	BookingNo      string         `json:"booking_no" gorm:"size:64;uniqueIndex;not null;comment:预订单号"`
	Title          string         `json:"title" gorm:"size:200;not null;comment:会议标题"`
	RoomID         uint           `json:"room_id" gorm:"index;not null;comment:会议室ID"`
	OrganizerID    uint           `json:"organizer_id" gorm:"index;not null;comment:预订人ID"`
	DeptID         *uint          `json:"dept_id" gorm:"index;comment:部门ID"`
	StartTime      xtime.DateTime `json:"start_time" gorm:"type:datetime;not null;comment:开始时间"`
	EndTime        xtime.DateTime `json:"end_time" gorm:"type:datetime;not null;comment:结束时间"`
	Attendees      int            `json:"attendees" gorm:"not null;default:0;comment:参会人数"`
	Topic          string         `json:"topic" gorm:"size:500;comment:会议主题/议程"`
	ApprovalStatus string         `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	Remark         string         `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (OaMeetingBooking) TableName() string { return "oa_meeting_booking" }
