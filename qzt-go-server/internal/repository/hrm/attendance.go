package hrm

import (
	"context"

	"github.com/shopspring/decimal"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
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

// GetByEmpDateType 按员工+日期+打卡类型查打卡记录(同日同类型重复打卡判定)。
// 不存在返回 gorm.ErrRecordNotFound(可用 repository.IsNotFound 判别)。
func (r *AttendanceClockRepo) GetByEmpDateType(ctx context.Context, employeeID uint, clockDate xtime.DateTime, clockType string) (*hrmmodel.HrmAttendanceClock, error) {
	var m hrmmodel.HrmAttendanceClock
	err := repoDB(ctx).Where("employee_id = ? AND clock_date = ? AND clock_type = ?",
		employeeID, clockDate, clockType).First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// CountDistinctCheckInDates 统计日期范围内去重打卡天数(月度汇总算实际出勤用)。
func (r *AttendanceClockRepo) CountDistinctCheckInDates(ctx context.Context, employeeID uint, clockType, startDate, endDate string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(&hrmmodel.HrmAttendanceClock{}).
		Where("employee_id = ? AND clock_type = ? AND clock_date BETWEEN ? AND ?",
			employeeID, clockType, startDate, endDate).
		Distinct("clock_date").Count(&n).Error
	return n, err
}

// ── 请假 ──

type LeaveRepo struct {
	repository.BaseRepo[hrmmodel.HrmLeave]
}

func NewLeaveRepo() *LeaveRepo { return &LeaveRepo{} }

func (r *LeaveRepo) Update(ctx context.Context, m *hrmmodel.HrmLeave) error {
	return r.BaseRepo.Update(ctx, m, "LeaveNo", "LeaveType", "StartDate", "EndDate", "DurationDays", "Reason", "Status", "ApprovalStatus", "ApproverID", "ApproveTime", "ApproveRemark")
}

// Page 请假单分页(按 employeeID/status 可选过滤,id DESC),复用 BaseRepo.PageList。
func (r *LeaveRepo) Page(ctx context.Context, page, pageSize int, employeeID uint, status string) ([]hrmmodel.HrmLeave, int64, error) {
	opts := &repository.QueryOptions{Order: []string{"id DESC"}}
	if employeeID > 0 {
		opts.Conds = append(opts.Conds, repository.Cond{Query: "employee_id = ?", Args: []any{employeeID}})
	}
	if status != "" {
		opts.Conds = append(opts.Conds, repository.Cond{Query: "status = ?", Args: []any{status}})
	}
	return r.PageList(ctx, page, pageSize, opts)
}

// SumApprovedLeaveDays 汇总员工已批准请假天数(月度汇总用)。
func (r *LeaveRepo) SumApprovedLeaveDays(ctx context.Context, employeeID uint) (decimal.Decimal, error) {
	var days decimal.Decimal
	err := repoDB(ctx).Model(&hrmmodel.HrmLeave{}).
		Where("employee_id = ? AND status = ?", employeeID, hrmmodel.LeaveStatusApproved).
		Select("COALESCE(SUM(duration_days),0)").Scan(&days).Error
	return days, err
}

// CountByNoPrefix 统计同前缀请假单数(编号规则 QJ+日期+序号 推算用)。
func (r *LeaveRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(&hrmmodel.HrmLeave{}).
		Where("leave_no LIKE ?", prefix+"%").
		Where("leave_no != ''").
		Count(&n).Error
	return n, err
}

// ── 加班 ──

type OvertimeRepo struct {
	repository.BaseRepo[hrmmodel.HrmOvertime]
}

func NewOvertimeRepo() *OvertimeRepo { return &OvertimeRepo{} }

func (r *OvertimeRepo) Update(ctx context.Context, m *hrmmodel.HrmOvertime) error {
	return r.BaseRepo.Update(ctx, m, "OvertimeNo", "StartDate", "EndDate", "DurationHours", "Reason", "Status", "ApproverID", "ApproveTime", "ApproveRemark", "CompensateType")
}

// Page 加班单分页(按 employeeID/status 可选过滤,id DESC),复用 BaseRepo.PageList。
func (r *OvertimeRepo) Page(ctx context.Context, page, pageSize int, employeeID uint, status string) ([]hrmmodel.HrmOvertime, int64, error) {
	opts := &repository.QueryOptions{Order: []string{"id DESC"}}
	if employeeID > 0 {
		opts.Conds = append(opts.Conds, repository.Cond{Query: "employee_id = ?", Args: []any{employeeID}})
	}
	if status != "" {
		opts.Conds = append(opts.Conds, repository.Cond{Query: "status = ?", Args: []any{status}})
	}
	return r.PageList(ctx, page, pageSize, opts)
}

// SumApprovedOvertimeHours 汇总员工已批准加班小时(月度汇总用)。
func (r *OvertimeRepo) SumApprovedOvertimeHours(ctx context.Context, employeeID uint) (decimal.Decimal, error) {
	var hours decimal.Decimal
	err := repoDB(ctx).Model(&hrmmodel.HrmOvertime{}).
		Where("employee_id = ? AND status = ?", employeeID, hrmmodel.LeaveStatusApproved).
		Select("COALESCE(SUM(duration_hours),0)").Scan(&hours).Error
	return hours, err
}

// CountByNoPrefix 统计同前缀加班单数(编号规则 JB+日期+序号 推算用)。
func (r *OvertimeRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(&hrmmodel.HrmOvertime{}).
		Where("overtime_no LIKE ?", prefix+"%").
		Where("overtime_no != ''").
		Count(&n).Error
	return n, err
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

// List 月度汇总列表(按年月/部门可选过滤,employee_id ASC)。
func (r *AttendanceSummaryRepo) List(ctx context.Context, yearMonth string, departmentID uint) ([]hrmmodel.HrmAttendanceSummary, error) {
	q := repoDB(ctx).Model(&hrmmodel.HrmAttendanceSummary{})
	if yearMonth != "" {
		q = q.Where("year_month = ?", yearMonth)
	}
	if departmentID > 0 {
		q = q.Where("employee_id IN (SELECT id FROM hrm_employee WHERE department_id = ?)", departmentID)
	}
	var list []hrmmodel.HrmAttendanceSummary
	err := q.Order("employee_id ASC").Find(&list).Error
	return list, err
}
