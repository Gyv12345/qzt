package hrm

import (
	"context"

	"gorm.io/gorm"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// recruitment.go 招聘 repository。

func recruitDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// ── 职位 ──

type JobRepo struct {
	repository.BaseRepo[hrmmodel.HrmJob]
}

func NewJobRepo() *JobRepo { return &JobRepo{} }

// CountByNoPrefix 统计同前缀职位数(编号规则 ZP+日期+序号 推算用)。
func (r *JobRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := recruitDB(ctx).Unscoped().Model(&hrmmodel.HrmJob{}).
		Where("job_no LIKE ?", prefix+"%").
		Where("job_no != ''").
		Count(&n).Error
	return n, err
}

func (r *JobRepo) PageList(ctx context.Context, page, pageSize int, keyword, jobNo, title string, status int8, deptID uint) ([]hrmmodel.HrmJob, int64, error) {
	var list []hrmmodel.HrmJob
	q := recruitDB(ctx).Model(&hrmmodel.HrmJob{})
	if jobNo != "" {
		q = q.Where("job_no LIKE ?", "%"+jobNo+"%")
	}
	if title != "" {
		q = q.Where("title LIKE ?", "%"+title+"%")
	}
	if keyword != "" {
		q = q.Where("title LIKE ? OR job_no LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status > 0 {
		q = q.Where("status = ?", status)
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

func (r *JobRepo) Update(ctx context.Context, m *hrmmodel.HrmJob) error {
	return r.BaseRepo.Update(ctx, m, "Title", "DeptID", "DeptName", "PositionID", "Headcount", "SalaryRange", "Education", "Experience", "Description", "Requirement", "HiringManagerID", "Status", "PublishDate")
}

// ── 候选人 ──

type CandidateRepo struct {
	repository.BaseRepo[hrmmodel.HrmCandidate]
}

func NewCandidateRepo() *CandidateRepo { return &CandidateRepo{} }

func (r *CandidateRepo) PageList(ctx context.Context, page, pageSize int, jobID uint, status int8, keyword string) ([]hrmmodel.HrmCandidate, int64, error) {
	var list []hrmmodel.HrmCandidate
	q := recruitDB(ctx).Model(&hrmmodel.HrmCandidate{})
	if jobID > 0 {
		q = q.Where("job_id = ?", jobID)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if keyword != "" {
		q = q.Where("name LIKE ? OR phone LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *CandidateRepo) Update(ctx context.Context, m *hrmmodel.HrmCandidate) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Phone", "Email", "Gender", "Age", "Education", "Experience", "Company", "ResumeURL", "Status", "Source", "InterviewDate", "Remark", "EvaluatorID")
}
