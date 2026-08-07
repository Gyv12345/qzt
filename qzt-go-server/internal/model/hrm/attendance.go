package hrm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// attendance.go HRM 考勤管理。
// 打卡记录(上班/下班) + 请假单 + 加班单 + 月度考勤汇总。

// 考勤打卡类型。
const (
	ClockTypeCheckIn  = "CHECK_IN"  // 上班打卡
	ClockTypeCheckOut = "CHECK_OUT" // 下班打卡
)

// 考勤状态(日维度)。
const (
	AttendanceNormal    = "NORMAL"     // 正常
	AttendanceLate      = "LATE"       // 迟到
	AttendanceEarly     = "EARLY_LEAVE" // 早退
	AttendanceAbsent    = "ABSENT"     // 缺勤
	AttendanceLeave     = "ON_LEAVE"   // 请假
	AttendanceBusiness  = "BUSINESS"   // 出差
)

// 请假类型。
const (
	LeaveTypePersonal  = "PERSONAL"   // 事假
	LeaveTypeSick      = "SICK"       // 病假
	LeaveTypeAnnual    = "ANNUAL"     // 年假
	LeaveTypeMarriage  = "MARRIAGE"   // 婚假
	LeaveTypeMaternity = "MATERNITY"  // 产假
	LeaveTypeOther     = "OTHER"      // 其他
)

// 请假/加班审批状态。
const (
	LeaveStatusPending  = "PENDING"   // 待审批
	LeaveStatusApproved = "APPROVED"  // 已批准
	LeaveStatusRejected = "REJECTED"  // 已驳回
	LeaveStatusCanceled = "CANCELED"  // 已撤销
)

// HrmAttendanceClock 考勤打卡记录。
type HrmAttendanceClock struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	EmployeeID uint           `json:"employee_id" gorm:"index:idx_clock_emp_date;not null;comment:员工ID"`
	ClockDate  xtime.DateTime `json:"clock_date" gorm:"type:date;index:idx_clock_emp_date;not null;comment:打卡日期"`
	ClockType  string         `json:"clock_type" gorm:"size:20;not null;comment:CHECK_IN/CHECK_OUT"`
	ClockTime  xtime.DateTime `json:"clock_time" gorm:"type:datetime;not null;comment:打卡时间"`
	Location   string         `json:"location" gorm:"size:255;comment:打卡地点"`
	Longitude  string         `json:"longitude" gorm:"size:32;comment:经度"`
	Latitude   string         `json:"latitude" gorm:"size:32;comment:纬度"`
	Remark     string         `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (HrmAttendanceClock) TableName() string { return "hrm_attendance_clock" }

// HrmLeave 请假单。
type HrmLeave struct {
	ID             uint               `json:"id" gorm:"primaryKey"`
	LeaveNo        string             `json:"leave_no" gorm:"size:64;comment:请假单号"`
	EmployeeID     uint               `json:"employee_id" gorm:"index;not null;comment:员工ID"`
	LeaveType      string             `json:"leave_type" gorm:"size:32;not null;comment:请假类型"`
	StartDate      xtime.DateTime     `json:"start_date" gorm:"type:datetime;not null;comment:开始时间"`
	EndDate        xtime.DateTime     `json:"end_date" gorm:"type:datetime;not null;comment:结束时间"`
	DurationDays   decimal.Decimal    `json:"duration_days" gorm:"type:decimal(5,1);not null;comment:请假天数"`
	Reason         string             `json:"reason" gorm:"size:500;comment:请假事由"`
	Status         string             `json:"status" gorm:"size:20;default:PENDING;index;comment:旧审批状态(兼容)"`
	ApprovalStatus string             `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批引擎状态(NONE/APPROVING/APPROVED/REJECTED/REVOKED)"`
	ApproverID     *uint              `json:"approver_id" gorm:"comment:审批人ID"`
	ApproveTime    xtime.NullDateTime `json:"approve_time" gorm:"type:datetime;comment:审批时间"`
	ApproveRemark  string             `json:"approve_remark" gorm:"size:500;comment:审批意见"`
	base.BaseModel
}

func (HrmLeave) TableName() string { return "hrm_leave" }

// HrmOvertime 加班单。
type HrmOvertime struct {
	ID           uint               `json:"id" gorm:"primaryKey"`
	OvertimeNo   string             `json:"overtime_no" gorm:"size:64;comment:加班单号"`
	EmployeeID   uint               `json:"employee_id" gorm:"index;not null;comment:员工ID"`
	StartDate    xtime.DateTime     `json:"start_date" gorm:"type:datetime;not null;comment:加班开始时间"`
	EndDate      xtime.DateTime     `json:"end_date" gorm:"type:datetime;not null;comment:加班结束时间"`
	DurationHours decimal.Decimal   `json:"duration_hours" gorm:"type:decimal(5,1);not null;comment:加班时长(小时)"`
	Reason       string             `json:"reason" gorm:"size:500;comment:加班事由"`
	Status       string             `json:"status" gorm:"size:20;default:PENDING;index;comment:审批状态"`
	ApproverID   *uint              `json:"approver_id" gorm:"comment:审批人ID"`
	ApproveTime  xtime.NullDateTime `json:"approve_time" gorm:"type:datetime;comment:审批时间"`
	ApproveRemark string            `json:"approve_remark" gorm:"size:500;comment:审批意见"`
	CompensateType string           `json:"compensate_type" gorm:"size:20;default:PAY;comment:补偿方式 PAY加班费/TO调休"`
	base.BaseModel
}

func (HrmOvertime) TableName() string { return "hrm_overtime" }

// HrmAttendanceSummary 月度考勤汇总(定时任务生成或手动统计)。
type HrmAttendanceSummary struct {
	ID              uint            `json:"id" gorm:"primaryKey"`
	EmployeeID      uint            `json:"employee_id" gorm:"uniqueIndex:uk_att_summary;not null;comment:员工ID"`
	YearMonth       string          `json:"year_month" gorm:"size:7;uniqueIndex:uk_att_summary;not null;comment:年月(2026-08)"`
	WorkDays        int             `json:"work_days" gorm:"default:22;comment:应出勤天数"`
	ActualDays      int             `json:"actual_days" gorm:"default:0;comment:实际出勤天数"`
	LateCount       int             `json:"late_count" gorm:"default:0;comment:迟到次数"`
	EarlyCount      int             `json:"early_count" gorm:"default:0;comment:早退次数"`
	AbsentDays      decimal.Decimal `json:"absent_days" gorm:"type:decimal(5,1);default:0;comment:缺勤天数"`
	LeaveDays       decimal.Decimal `json:"leave_days" gorm:"type:decimal(5,1);default:0;comment:请假天数"`
	OvertimeHours   decimal.Decimal `json:"overtime_hours" gorm:"type:decimal(5,1);default:0;comment:加班时长"`
	base.BaseModel
}

func (HrmAttendanceSummary) TableName() string { return "hrm_attendance_summary" }
