package hrm

import (
	"context"

	"gorm.io/gorm"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// performance.go 绩效 repository。

func perfDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

type PerformanceRepo struct {
	repository.BaseRepo[hrmmodel.HrmPerformance]
}

func NewPerformanceRepo() *PerformanceRepo { return &PerformanceRepo{} }

// CountByNoPrefix 统计同前缀绩效单数(编号规则 JX+日期+序号 推算用)。
func (r *PerformanceRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := perfDB(ctx).Model(&hrmmodel.HrmPerformance{}).
		Where("perf_no LIKE ?", prefix+"%").
		Where("perf_no != ''").
		Count(&n).Error
	return n, err
}

func (r *PerformanceRepo) PageList(ctx context.Context, page, pageSize int, keyword, period string, status int8, employeeID, deptID uint) ([]hrmmodel.HrmPerformance, int64, error) {
	var list []hrmmodel.HrmPerformance
	q := perfDB(ctx).Model(&hrmmodel.HrmPerformance{})
	if keyword != "" {
		q = q.Where("title LIKE ? OR employee_name LIKE ? OR perf_no LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if period != "" {
		q = q.Where("period = ?", period)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if employeeID > 0 {
		q = q.Where("employee_id = ?", employeeID)
	}
	if deptID > 0 {
		q = q.Where("dept_id = ?", deptID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *PerformanceRepo) Update(ctx context.Context, m *hrmmodel.HrmPerformance) error {
	return r.BaseRepo.Update(ctx, m, "Title", "EmployeeID", "EmployeeName", "DeptID", "DeptName", "Period", "StartDate", "EndDate", "Status", "ReviewerID", "SelfScore", "SelfComment", "SelfTime", "ReviewScore", "ReviewComment", "ReviewTime", "FinalScore", "Grade")
}

// ── 指标项 ──

type PerfItemRepo struct {
	repository.BaseRepo[hrmmodel.HrmPerfItem]
}

func NewPerfItemRepo() *PerfItemRepo { return &PerfItemRepo{} }

func (r *PerfItemRepo) ListByPerf(ctx context.Context, perfID uint) ([]hrmmodel.HrmPerfItem, error) {
	var list []hrmmodel.HrmPerfItem
	err := perfDB(ctx).Where("perf_id = ?", perfID).Order("id ASC").Find(&list).Error
	return list, err
}

func (r *PerfItemRepo) DeleteByPerf(ctx context.Context, perfID uint) error {
	return perfDB(ctx).Where("perf_id = ?", perfID).Delete(&hrmmodel.HrmPerfItem{}).Error
}

func (r *PerfItemRepo) BatchCreate(ctx context.Context, items []hrmmodel.HrmPerfItem) error {
	if len(items) == 0 {
		return nil
	}
	return perfDB(ctx).Create(&items).Error
}
