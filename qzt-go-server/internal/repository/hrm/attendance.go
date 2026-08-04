package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// attendance.go 考勤 repository(打卡/请假/加班/月度汇总)。

type AttendanceClockRepo struct {
	repository.BaseRepo[hrmmodel.HrmAttendanceClock]
}

func NewAttendanceClockRepo() *AttendanceClockRepo { return &AttendanceClockRepo{} }

// ListByEmpDate 按员工+日期范围查打卡记录。
func (r *AttendanceClockRepo) ListByEmpDate(ctx context.Context, employeeID uint, startDate, endDate string) ([]hrmmodel.HrmAttendanceClock, error) {
	var list []hrmmodel.HrmAttendanceClock
	q := repoDB(ctx).Where("employee_id = ?", employeeID)
	if startDate != "" {
		q = q.Where("DATE(clock_date) >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("DATE(clock_date) <= ?", endDate)
	}
	err := q.Order("clock_date DESC, clock_time DESC").Find(&list).Error
	return list, err
}

func (r *AttendanceClockRepo) Update(ctx context.Context, m *hrmmodel.HrmAttendanceClock) error {
	return r.BaseRepo.Update(ctx, m, "ClockDate", "ClockType", "ClockTime", "Location", "Longitude", "Latitude", "Remark")
}

// ── 请假 ──

type LeaveRepo struct {
	repository.BaseRepo[hrmmodel.HrmLeave]
}

func NewLeaveRepo() *LeaveRepo { return &LeaveRepo{} }

func (r *LeaveRepo) Update(ctx context.Context, m *hrmmodel.HrmLeave) error {
	return r.BaseRepo.Update(ctx, m, "LeaveType", "StartDate", "EndDate", "DurationDays", "Reason", "Status", "ApproverID", "ApproveTime", "ApproveRemark")
}

// ── 加班 ──

type OvertimeRepo struct {
	repository.BaseRepo[hrmmodel.HrmOvertime]
}

func NewOvertimeRepo() *OvertimeRepo { return &OvertimeRepo{} }

func (r *OvertimeRepo) Update(ctx context.Context, m *hrmmodel.HrmOvertime) error {
	return r.BaseRepo.Update(ctx, m, "StartDate", "EndDate", "DurationHours", "Reason", "Status", "ApproverID", "ApproveTime", "ApproveRemark", "CompensateType")
}

// ── 月度汇总 ──

type AttendanceSummaryRepo struct {
	repository.BaseRepo[hrmmodel.HrmAttendanceSummary]
}

func NewAttendanceSummaryRepo() *AttendanceSummaryRepo { return &AttendanceSummaryRepo{} }

func (r *AttendanceSummaryRepo) Update(ctx context.Context, m *hrmmodel.HrmAttendanceSummary) error {
	return r.BaseRepo.Update(ctx, m, "WorkDays", "ActualDays", "LateCount", "EarlyCount", "AbsentDays", "LeaveDays", "OvertimeHours")
}

// GetByEmpMonth 按员工+年月查汇总。
func (r *AttendanceSummaryRepo) GetByEmpMonth(ctx context.Context, employeeID uint, yearMonth string) (*hrmmodel.HrmAttendanceSummary, error) {
	var s hrmmodel.HrmAttendanceSummary
	err := repoDB(ctx).Where("employee_id = ? AND year_month = ?", employeeID, yearMonth).First(&s).Error
	return &s, err
}
