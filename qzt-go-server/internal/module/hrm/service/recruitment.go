package service

import (
	"context"
	"errors"
	"time"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/pkg/numbergen"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/pkg/xtime"
)

// recruitment.go 招聘服务。

type RecruitmentService struct {
	jobRepo        *hrmrepo.JobRepo
	candidateRepo  *hrmrepo.CandidateRepo
}

func NewRecruitmentService() *RecruitmentService {
	return &RecruitmentService{jobRepo: hrmrepo.NewJobRepo(), candidateRepo: hrmrepo.NewCandidateRepo()}
}

// ── 职位 ──

type CreateJobRequest struct {
	Title           string `json:"title" binding:"required"`
	DeptID          *uint  `json:"dept_id"`
	DeptName        string `json:"dept_name"`
	PositionID      *uint  `json:"position_id"`
	Headcount       int    `json:"headcount"`
	SalaryRange     string `json:"salary_range"`
	Education       string `json:"education"`
	Experience      string `json:"experience"`
	Description     string `json:"description"`
	Requirement     string `json:"requirement"`
	HiringManagerID *uint  `json:"hiring_manager_id"`
}

func (s *RecruitmentService) CreateJob(ctx context.Context, req *CreateJobRequest) (*hrmmodel.HrmJob, error) {
	no, _ := numbergen.Generate(ctx, "job")
	j := &hrmmodel.HrmJob{
		JobNo:           no,
		Title:           req.Title,
		DeptID:          req.DeptID,
		DeptName:        req.DeptName,
		PositionID:      req.PositionID,
		Headcount:       req.Headcount,
		SalaryRange:     req.SalaryRange,
		Education:       req.Education,
		Experience:      req.Experience,
		Description:     req.Description,
		Requirement:     req.Requirement,
		HiringManagerID: req.HiringManagerID,
		Status:          hrmmodel.JobStatusDraft,
	}
	if j.Headcount == 0 {
		j.Headcount = 1
	}
	if err := s.jobRepo.Create(ctx, j); err != nil {
		return nil, err
	}
	return j, nil
}

func (s *RecruitmentService) ListJobs(ctx context.Context, page, pageSize int, keyword, jobNo, title string, status int8, deptID uint) ([]hrmmodel.HrmJob, int64, error) {
	return s.jobRepo.PageList(ctx, page, pageSize, keyword, jobNo, title, status, deptID)
}

func (s *RecruitmentService) GetJob(ctx context.Context, id uint) (*hrmmodel.HrmJob, error) {
	j, err := s.jobRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return j, nil
}

// GetCandidate 候选人详情。
func (s *RecruitmentService) GetCandidate(ctx context.Context, id uint) (*hrmmodel.HrmCandidate, error) {
	c, err := s.candidateRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return c, nil
}

type UpdateJobRequest struct {
	Title           string `json:"title"` // 留空=不修改(支持仅改状态的部分更新)
	DeptID          *uint  `json:"dept_id"`
	DeptName        string `json:"dept_name"`
	PositionID      *uint  `json:"position_id"`
	Headcount       int    `json:"headcount"`
	SalaryRange     string `json:"salary_range"`
	Education       string `json:"education"`
	Experience      string `json:"experience"`
	Description     string `json:"description"`
	Requirement     string `json:"requirement"`
	HiringManagerID *uint  `json:"hiring_manager_id"`
	Status          int8   `json:"status"`
}

func (s *RecruitmentService) UpdateJob(ctx context.Context, id uint, req *UpdateJobRequest) error {
	j, err := s.jobRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("职位不存在")
	}
	if req.Title != "" {
		j.Title = req.Title
	}
	if req.DeptID != nil {
		j.DeptID = req.DeptID
	}
	if req.DeptName != "" {
		j.DeptName = req.DeptName
	}
	if req.PositionID != nil {
		j.PositionID = req.PositionID
	}
	if req.Headcount > 0 {
		j.Headcount = req.Headcount
	}
	if req.SalaryRange != "" {
		j.SalaryRange = req.SalaryRange
	}
	if req.Education != "" {
		j.Education = req.Education
	}
	if req.Experience != "" {
		j.Experience = req.Experience
	}
	if req.Description != "" {
		j.Description = req.Description
	}
	if req.Requirement != "" {
		j.Requirement = req.Requirement
	}
	if req.HiringManagerID != nil {
		j.HiringManagerID = req.HiringManagerID
	}
	if req.Status > 0 {
		oldStatus := j.Status
		j.Status = req.Status
		// 发布时记录发布日期
		if req.Status == hrmmodel.JobStatusOpen && oldStatus != hrmmodel.JobStatusOpen {
			j.PublishDate = xtime.NewNullDateTimeFromTime(time.Now())
		}
	}
	return s.jobRepo.Update(ctx, j)
}

func (s *RecruitmentService) DeleteJob(ctx context.Context, id uint) error {
	if _, err := s.jobRepo.GetByID(ctx, id); err != nil {
		return errors.New("职位不存在")
	}
	return s.jobRepo.Delete(ctx, id)
}

// ── 候选人 ──

type CreateCandidateRequest struct {
	JobID         uint   `json:"job_id" binding:"required"`
	Name          string `json:"name" binding:"required"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	Gender        string `json:"gender"`
	Age           int    `json:"age"`
	Education     string `json:"education"`
	Experience    string `json:"experience"`
	Company       string `json:"company"`
	ResumeURL     string `json:"resume_url"`
	Source        string `json:"source"`
	Remark        string `json:"remark"`
}

func (s *RecruitmentService) CreateCandidate(ctx context.Context, req *CreateCandidateRequest) (*hrmmodel.HrmCandidate, error) {
	if _, err := s.jobRepo.GetByID(ctx, req.JobID); err != nil {
		return nil, errors.New("职位不存在")
	}
	c := &hrmmodel.HrmCandidate{
		JobID:      req.JobID,
		Name:       req.Name,
		Phone:      req.Phone,
		Email:      req.Email,
		Gender:     req.Gender,
		Age:        req.Age,
		Education:  req.Education,
		Experience: req.Experience,
		Company:    req.Company,
		ResumeURL:  req.ResumeURL,
		Source:     req.Source,
		Remark:     req.Remark,
		Status:     hrmmodel.CandidateStatusNew,
	}
	if err := s.candidateRepo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *RecruitmentService) ListCandidates(ctx context.Context, page, pageSize int, jobID uint, status int8, keyword string) ([]hrmmodel.HrmCandidate, int64, error) {
	return s.candidateRepo.PageList(ctx, page, pageSize, jobID, status, keyword)
}

type UpdateCandidateRequest struct {
	Name          string `json:"name"` // 留空=不修改(支持仅改状态的部分更新)
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	Gender        string `json:"gender"`
	Age           int    `json:"age"`
	Education     string `json:"education"`
	Experience    string `json:"experience"`
	Company       string `json:"company"`
	ResumeURL     string `json:"resume_url"`
	Status        int8   `json:"status"`
	Source        string `json:"source"`
	InterviewDate string `json:"interview_date"`
	Remark        string `json:"remark"`
	EvaluatorID   *uint  `json:"evaluator_id"`
}

func (s *RecruitmentService) UpdateCandidate(ctx context.Context, id uint, req *UpdateCandidateRequest) error {
	c, err := s.candidateRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("候选人不存在")
	}
	if req.Name != "" {
		c.Name = req.Name
	}
	if req.Phone != "" {
		c.Phone = req.Phone
	}
	if req.Email != "" {
		c.Email = req.Email
	}
	if req.Gender != "" {
		c.Gender = req.Gender
	}
	if req.Age > 0 {
		c.Age = req.Age
	}
	if req.Education != "" {
		c.Education = req.Education
	}
	if req.Experience != "" {
		c.Experience = req.Experience
	}
	if req.Company != "" {
		c.Company = req.Company
	}
	if req.ResumeURL != "" {
		c.ResumeURL = req.ResumeURL
	}
	if req.Source != "" {
		c.Source = req.Source
	}
	if req.InterviewDate != "" {
		c.InterviewDate = req.InterviewDate
	}
	if req.Remark != "" {
		c.Remark = req.Remark
	}
	if req.EvaluatorID != nil {
		c.EvaluatorID = req.EvaluatorID
	}
	if req.Status > 0 {
		c.Status = req.Status
	}
	return s.candidateRepo.Update(ctx, c)
}

func (s *RecruitmentService) DeleteCandidate(ctx context.Context, id uint) error {
	if _, err := s.candidateRepo.GetByID(ctx, id); err != nil {
		return errors.New("候选人不存在")
	}
	return s.candidateRepo.Delete(ctx, id)
}
