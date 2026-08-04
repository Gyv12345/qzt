package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/pkg/xtime"
)

// attendance.go 考勤服务:打卡 / 请假 / 加班 / 月度汇总。

// AttendanceService 考勤服务。
type AttendanceService struct {
	clockRepo   *hrmrepo.AttendanceClockRepo
	leaveRepo   *hrmrepo.LeaveRepo
	overtimeRepo *hrmrepo.OvertimeRepo
	summaryRepo *hrmrepo.AttendanceSummaryRepo
	empRepo     *hrmrepo.EmployeeRepo
}

func NewAttendanceService() *AttendanceService {
	return &AttendanceService{
		clockRepo:   hrmrepo.NewAttendanceClockRepo(),
		leaveRepo:   hrmrepo.NewLeaveRepo(),
		overtimeRepo: hrmrepo.NewOvertimeRepo(),
		summaryRepo: hrmrepo.NewAttendanceSummaryRepo(),
		empRepo:     hrmrepo.NewEmployeeRepo(),
	}
}

// ── 打卡 ──

// ClockInRequest 打卡请求。
type ClockInRequest struct {
	EmployeeID uint   `json:"employee_id" binding:"required"`
	ClockType  string `json:"clock_type" binding:"required"` // CHECK_IN / CHECK_OUT
	Location   string `json:"location"`
	Longitude  string `json:"longitude"`
	Latitude   string `json:"latitude"`
	Remark     string `json:"remark"`
}

// ClockIn 打卡(上班/下班)。同一天同类型重复打卡则更新。
func (s *AttendanceService) ClockIn(ctx context.Context, req *ClockInRequest) (*hrmmodel.HrmAttendanceClock, error) {
	if req.ClockType != hrmmodel.ClockTypeCheckIn && req.ClockType != hrmmodel.ClockTypeCheckOut {
		return nil, errors.New("clock_type 只能是 CHECK_IN 或 CHECK_OUT")
	}
	now := time.Now()
	today := xtime.NewDateTime(time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()))

	// 查今天是否已打过同类型卡
	var existing hrmmodel.HrmAttendanceClock
	db := repository.DBFrom(ctx)
	result := db.Where("employee_id = ? AND clock_date = ? AND clock_type = ?",
		req.EmployeeID, today, req.ClockType).First(&existing)

	clock := &hrmmodel.HrmAttendanceClock{
		EmployeeID: req.EmployeeID,
		ClockDate:  today,
		ClockType:  req.ClockType,
		ClockTime:  xtime.Now(),
		Location:   req.Location,
		Longitude:  req.Longitude,
		Latitude:   req.Latitude,
		Remark:     req.Remark,
	}

	if result.Error == nil {
		// 已存在 → 更新
		clock.ID = existing.ID
		if err := s.clockRepo.Update(ctx, clock); err != nil {
			return nil, err
		}
	} else if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 不存在 → 创建
		if err := s.clockRepo.Create(ctx, clock); err != nil {
			return nil, err
		}
	} else {
		return nil, result.Error
	}
	return clock, nil
}

// ClockList 按员工+日期范围查打卡记录。
func (s *AttendanceService) ClockList(ctx context.Context, employeeID uint, startDate, endDate string) ([]hrmmodel.HrmAttendanceClock, error) {
	return s.clockRepo.ListByEmpDate(ctx, employeeID, startDate, endDate)
}

// ── 请假 ──

// LeaveRequest 请假请求。
type LeaveRequest struct {
	EmployeeID   uint   `json:"employee_id" binding:"required"`
	LeaveType    string `json:"leave_type" binding:"required"`
	StartDate    string `json:"start_date" binding:"required"` // yyyy-MM-dd HH:mm:ss
	EndDate      string `json:"end_date" binding:"required"`
	DurationDays string `json:"duration_days" binding:"required"`
	Reason       string `json:"reason"`
}

// ApplyLeave 申请请假。
func (s *AttendanceService) ApplyLeave(ctx context.Context, req *LeaveRequest) (*hrmmodel.HrmLeave, error) {
	start, err := parseDateTime(req.StartDate)
	if err != nil {
		return nil, errors.New("start_date 格式错误,应为 yyyy-MM-dd HH:mm:ss")
	}
	end, err := parseDateTime(req.EndDate)
	if err != nil {
		return nil, errors.New("end_date 格式错误")
	}
	days, err := decimal.NewFromString(req.DurationDays)
	if err != nil {
		return nil, errors.New("duration_days 格式错误")
	}
	leave := &hrmmodel.HrmLeave{
		EmployeeID:   req.EmployeeID,
		LeaveType:    req.LeaveType,
		StartDate:    xtime.NewDateTime(start),
		EndDate:      xtime.NewDateTime(end),
		DurationDays: days,
		Reason:       req.Reason,
		Status:       hrmmodel.LeaveStatusPending,
	}
	if err := s.leaveRepo.Create(ctx, leave); err != nil {
		return nil, err
	}
	return leave, nil
}

// ApproveLeave 审批请假。
func (s *AttendanceService) ApproveLeave(ctx context.Context, id, approverID uint, approved bool, remark string) error {
	leave, err := s.leaveRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("请假单不存在")
	}
	if leave.Status != hrmmodel.LeaveStatusPending {
		return errors.New("请假单已处理")
	}
	if approved {
		leave.Status = hrmmodel.LeaveStatusApproved
	} else {
		leave.Status = hrmmodel.LeaveStatusRejected
	}
	leave.ApproverID = &approverID
	leave.ApproveTime = xtime.NewNullDateTimeFromTime(time.Now())
	leave.ApproveRemark = remark
	return s.leaveRepo.Update(ctx, leave)
}

// LeaveList 请假单列表(按员工或状态过滤)。
func (s *AttendanceService) LeaveList(ctx context.Context, page, pageSize int, employeeID uint, status string) ([]hrmmodel.HrmLeave, int64, error) {
	return leaveListQuery(ctx, page, pageSize, employeeID, status)
}

// leaveListQuery 请假单分页(直接用 GORM,按 employeeID/status 可选过滤)。
func leaveListQuery(ctx context.Context, page, pageSize int, employeeID uint, status string) ([]hrmmodel.HrmLeave, int64, error) {
	db := repository.DBFrom(ctx).Model(&hrmmodel.HrmLeave{})
	if employeeID > 0 {
		db = db.Where("employee_id = ?", employeeID)
	}
	if status != "" {
		db = db.Where("status = ?", status)
	}
	var total int64
	db.Count(&total)
	var list []hrmmodel.HrmLeave
	err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ── 加班 ──

// OvertimeRequest 加班请求。
type OvertimeRequest struct {
	EmployeeID    uint   `json:"employee_id" binding:"required"`
	StartDate     string `json:"start_date" binding:"required"`
	EndDate       string `json:"end_date" binding:"required"`
	DurationHours string `json:"duration_hours" binding:"required"`
	Reason        string `json:"reason"`
	CompensateType string `json:"compensate_type"` // PAY / TO
}

// ApplyOvertime 申请加班。
func (s *AttendanceService) ApplyOvertime(ctx context.Context, req *OvertimeRequest) (*hrmmodel.HrmOvertime, error) {
	start, err := parseDateTime(req.StartDate)
	if err != nil {
		return nil, errors.New("start_date 格式错误")
	}
	end, err := parseDateTime(req.EndDate)
	if err != nil {
		return nil, errors.New("end_date 格式错误")
	}
	hours, err := decimal.NewFromString(req.DurationHours)
	if err != nil {
		return nil, errors.New("duration_hours 格式错误")
	}
	compType := req.CompensateType
	if compType == "" {
		compType = "PAY"
	}
	ot := &hrmmodel.HrmOvertime{
		EmployeeID:     req.EmployeeID,
		StartDate:      xtime.NewDateTime(start),
		EndDate:        xtime.NewDateTime(end),
		DurationHours:  hours,
		Reason:         req.Reason,
		Status:         hrmmodel.LeaveStatusPending,
		CompensateType: compType,
	}
	if err := s.overtimeRepo.Create(ctx, ot); err != nil {
		return nil, err
	}
	return ot, nil
}

// ApproveOvertime 审批加班。
func (s *AttendanceService) ApproveOvertime(ctx context.Context, id, approverID uint, approved bool, remark string) error {
	ot, err := s.overtimeRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("加班单不存在")
	}
	if ot.Status != hrmmodel.LeaveStatusPending {
		return errors.New("加班单已处理")
	}
	if approved {
		ot.Status = hrmmodel.LeaveStatusApproved
	} else {
		ot.Status = hrmmodel.LeaveStatusRejected
	}
	ot.ApproverID = &approverID
	ot.ApproveTime = xtime.NewNullDateTimeFromTime(time.Now())
	ot.ApproveRemark = remark
	return s.overtimeRepo.Update(ctx, ot)
}

// OvertimeList 加班单列表。
func (s *AttendanceService) OvertimeList(ctx context.Context, page, pageSize int, employeeID uint, status string) ([]hrmmodel.HrmOvertime, int64, error) {
	return overtimeListQuery(ctx, page, pageSize, employeeID, status)
}

// overtimeListQuery 加班单分页。
func overtimeListQuery(ctx context.Context, page, pageSize int, employeeID uint, status string) ([]hrmmodel.HrmOvertime, int64, error) {
	db := repository.DBFrom(ctx).Model(&hrmmodel.HrmOvertime{})
	if employeeID > 0 {
		db = db.Where("employee_id = ?", employeeID)
	}
	if status != "" {
		db = db.Where("status = ?", status)
	}
	var total int64
	db.Count(&total)
	var list []hrmmodel.HrmOvertime
	err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ── 月度汇总 ──

// GenerateSummary 生成月度考勤汇总(按 employeeID + yearMonth,如 "2026-08")。
func (s *AttendanceService) GenerateSummary(ctx context.Context, employeeID uint, yearMonth string) (*hrmmodel.HrmAttendanceSummary, error) {
	// 解析年月
	year, month, err := parseYearMonth(yearMonth)
	if err != nil {
		return nil, err
	}
	startOfMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)

	// 统计打卡:迟到次数/早退次数/实际出勤天数
	// 简化:统计该月打卡记录天数
	var actualDays int64
	repository.DBFrom(ctx).Model(&hrmmodel.HrmAttendanceClock{}).
		Where("employee_id = ? AND clock_type = ? AND clock_date BETWEEN ? AND ?",
			employeeID, hrmmodel.ClockTypeCheckIn, startOfMonth.Format("2006-01-02"), endOfMonth.Format("2006-01-02")).
		Distinct("clock_date").Count(&actualDays)

	// 统计已批准的请假天数
	var leaveDays decimal.Decimal
	repository.DBFrom(ctx).Model(&hrmmodel.HrmLeave{}).
		Where("employee_id = ? AND status = ?", employeeID, hrmmodel.LeaveStatusApproved).
		Select("COALESCE(SUM(duration_days),0)").Scan(&leaveDays)

	// 统计已批准的加班时长
	var otHours decimal.Decimal
	repository.DBFrom(ctx).Model(&hrmmodel.HrmOvertime{}).
		Where("employee_id = ? AND status = ?", employeeID, hrmmodel.LeaveStatusApproved).
		Select("COALESCE(SUM(duration_hours),0)").Scan(&otHours)

	// 应出勤天数(简化:工作日 = 22)
	workDays := 22

	// 查是否已有汇总记录
	existing, err := s.summaryRepo.GetByEmpMonth(ctx, employeeID, yearMonth)
	summary := &hrmmodel.HrmAttendanceSummary{
		EmployeeID:    employeeID,
		YearMonth:     yearMonth,
		WorkDays:      workDays,
		ActualDays:    int(actualDays),
		LeaveDays:     leaveDays,
		OvertimeHours: otHours,
	}
	if err == nil {
		summary.ID = existing.ID
		if err := s.summaryRepo.Update(ctx, summary); err != nil {
			return nil, err
		}
	} else {
		if err := s.summaryRepo.Create(ctx, summary); err != nil {
			return nil, err
		}
	}
	return summary, nil
}

// SummaryList 月度汇总列表(按部门或年月)。
func (s *AttendanceService) SummaryList(ctx context.Context, yearMonth string, departmentID uint) ([]hrmmodel.HrmAttendanceSummary, error) {
	q := repository.DBFrom(ctx).Model(&hrmmodel.HrmAttendanceSummary{})
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

// ── 内部辅助 ──

// parseDateTime 解析 yyyy-MM-dd HH:mm:ss。
func parseDateTime(s string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04:05", s, time.Local)
}

// parseYearMonth 解析 yyyy-MM。
func parseYearMonth(ym string) (int, int, error) {
	t, err := time.ParseInLocation("2006-01", ym, time.Local)
	if err != nil {
		return 0, 0, fmt.Errorf("year_month 格式错误,应为 yyyy-MM: %w", err)
	}
	return t.Year(), int(t.Month()), nil
}

