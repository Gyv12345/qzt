package hrm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// schedule.go 考勤排班 v2:班次/节假日/考勤组/排班。
// 未排班员工沿用原固定口径,有排班员工按班次判定迟到/早退/缺卡并重算汇总。

// 节假日类型。
const (
	HolidayTypeHoliday = "HOLIDAY" // 放假
	HolidayTypeWorkday = "WORKDAY" // 调休补班
)

// 排班来源。
const (
	ScheduleSourceManual = "MANUAL" // 手动排班
	ScheduleSourceGroup  = "GROUP"  // 考勤组推导
)

// HrmShift 考勤班次。
type HrmShift struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 班次名称
	Name string `json:"name" gorm:"size:64;not null;comment:班次名称"`
	// 上班时间 HH:mm:ss
	StartTime string `json:"start_time" gorm:"size:8;not null;comment:上班时间 HH:mm:ss"`
	// 下班时间 HH:mm:ss
	EndTime string `json:"end_time" gorm:"size:8;not null;comment:下班时间 HH:mm:ss"`
	// 弹性分钟数(迟到判定宽限)
	FlexMinutes int `json:"flex_minutes" gorm:"not null;default:0;comment:弹性分钟数(迟到判定宽限)"`
	// 是否跨天(1=下班时间小于上班时间)
	CrossDay int8 `json:"cross_day" gorm:"not null;default:0;comment:是否跨天(1=endTime<startTime)"`
	// 1启用 0停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 0停用"`
	base.BaseModel
}

func (HrmShift) TableName() string { return "hrm_shift" }

// HrmHoliday 节假日(法定假日+调休补班)。
type HrmHoliday struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 日期
	HolidayDate xtime.DateTime `json:"holiday_date" gorm:"type:date;uniqueIndex:uk_date;not null;comment:日期"`
	// 名称
	Name string `json:"name" gorm:"size:64;not null;comment:名称(如 国庆节/调休补班)"`
	// HOLIDAY放假 / WORKDAY调休补班
	Type string `json:"type" gorm:"size:16;not null;comment:HOLIDAY放假 / WORKDAY调休补班"`
	base.BaseModel
}

func (HrmHoliday) TableName() string { return "hrm_holiday" }

// HrmAttendanceGroup 考勤组(按部门绑定默认班次)。
type HrmAttendanceGroup struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 考勤组名称
	Name string `json:"name" gorm:"size:64;not null;comment:考勤组名称"`
	// 绑定部门(NULL=不绑定仅手动指派)
	DeptID *uint `json:"dept_id" gorm:"comment:绑定部门"`
	// 默认班次ID
	ShiftID uint `json:"shift_id" gorm:"not null;comment:默认班次ID"`
	// 1启用 0停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 0停用"`
	base.BaseModel
}

func (HrmAttendanceGroup) TableName() string { return "hrm_attendance_group" }

// HrmSchedule 排班日历(员工×日期×班次)。
type HrmSchedule struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 员工ID
	EmployeeID uint `json:"employee_id" gorm:"uniqueIndex:uk_emp_date,priority:1;not null;comment:员工ID"`
	// 排班日期
	ScheduleDate xtime.DateTime `json:"schedule_date" gorm:"type:date;uniqueIndex:uk_emp_date,priority:2;not null;comment:排班日期"`
	// 班次ID
	ShiftID uint `json:"shift_id" gorm:"not null;comment:班次ID"`
	// 来源(MANUAL手动/GROUP考勤组推导)
	Source string `json:"source" gorm:"size:16;not null;default:MANUAL;comment:来源(MANUAL/GROUP)"`
	base.BaseModel
}

func (HrmSchedule) TableName() string { return "hrm_schedule" }
