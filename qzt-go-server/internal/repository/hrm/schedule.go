package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// schedule.go 排班 v2 repository:班次/节假日/考勤组/排班读写。

type ShiftRepo struct {
	repository.BaseRepo[hrmmodel.HrmShift]
}

func NewShiftRepo() *ShiftRepo { return &ShiftRepo{} }

type HolidayRepo struct {
	repository.BaseRepo[hrmmodel.HrmHoliday]
}

func NewHolidayRepo() *HolidayRepo { return &HolidayRepo{} }

// ListByRange 按日期区间列节假日(汇总判定用)。
func (r *HolidayRepo) ListByRange(ctx context.Context, start, end string) ([]hrmmodel.HrmHoliday, error) {
	var list []hrmmodel.HrmHoliday
	err := repoDB(ctx).Where("holiday_date BETWEEN ? AND ?", start, end).Find(&list).Error
	return list, err
}

type AttendanceGroupRepo struct {
	repository.BaseRepo[hrmmodel.HrmAttendanceGroup]
}

func NewAttendanceGroupRepo() *AttendanceGroupRepo { return &AttendanceGroupRepo{} }

type ScheduleRepo struct {
	repository.BaseRepo[hrmmodel.HrmSchedule]
}

func NewScheduleRepo() *ScheduleRepo { return &ScheduleRepo{} }

// ListByEmpRange 按员工+日期区间列排班(汇总判定用)。
func (r *ScheduleRepo) ListByEmpRange(ctx context.Context, employeeID uint, start, end string) ([]hrmmodel.HrmSchedule, error) {
	var list []hrmmodel.HrmSchedule
	err := repoDB(ctx).Where("employee_id = ? AND schedule_date BETWEEN ? AND ?", employeeID, start, end).Find(&list).Error
	return list, err
}

// ListByMonth 按月列全部排班(月视图)。
func (r *ScheduleRepo) ListByMonth(ctx context.Context, month string) ([]hrmmodel.HrmSchedule, error) {
	var list []hrmmodel.HrmSchedule
	err := repoDB(ctx).Where("DATE_FORMAT(schedule_date, '%Y-%m') = ?", month).Find(&list).Error
	return list, err
}

// BatchUpsert 整月批量排班(upsert 按员工+日期,同键更新班次)。
func (r *ScheduleRepo) BatchUpsert(ctx context.Context, rows []hrmmodel.HrmSchedule) error {
	return repoDB(ctx).Save(&rows).Error
}
