package service

import (
	"context"
	"errors"
	"time"

	"github.com/shopspring/decimal"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/pkg/numbergen"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// performance.go 绩效考核服务。

type PerformanceService struct {
	repo     *hrmrepo.PerformanceRepo
	itemRepo *hrmrepo.PerfItemRepo
}

func NewPerformanceService() *PerformanceService {
	return &PerformanceService{repo: hrmrepo.NewPerformanceRepo(), itemRepo: hrmrepo.NewPerfItemRepo()}
}

type PerfItemInput struct {
	ItemName   string `json:"item_name" binding:"required"`
	Weight     string `json:"weight"`
	TargetDesc string `json:"target_desc"`
}

type CreatePerfRequest struct {
	Title        string          `json:"title" binding:"required"`
	EmployeeID   uint            `json:"employee_id" binding:"required"`
	EmployeeName string          `json:"employee_name"`
	DeptID       *uint           `json:"dept_id"`
	DeptName     string          `json:"dept_name"`
	Period       string          `json:"period"`
	StartDate    string          `json:"start_date" binding:"required"`
	EndDate      string          `json:"end_date" binding:"required"`
	ReviewerID   *uint           `json:"reviewer_id"`
	Items        []PerfItemInput `json:"items"`
}

func (s *PerformanceService) Create(ctx context.Context, req *CreatePerfRequest) (*hrmmodel.HrmPerformance, error) {
	no, _ := numbergen.Generate(ctx, "performance")
	startDate, err := parsePerfDate(req.StartDate)
	if err != nil {
		return nil, errors.New("开始日期格式错误")
	}
	endDate, err := parsePerfDate(req.EndDate)
	if err != nil {
		return nil, errors.New("结束日期格式错误")
	}
	p := &hrmmodel.HrmPerformance{
		PerfNo:      no,
		Title:       req.Title,
		EmployeeID:  req.EmployeeID,
		EmployeeName: req.EmployeeName,
		DeptID:      req.DeptID,
		DeptName:    req.DeptName,
		Period:      req.Period,
		StartDate:   startDate,
		EndDate:     endDate,
		ReviewerID:  req.ReviewerID,
		Status:      hrmmodel.PerfStatusActive,
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, p); err != nil {
			return err
		}
		items := make([]hrmmodel.HrmPerfItem, 0, len(req.Items))
		for _, it := range req.Items {
			w, _ := decimal.NewFromString(it.Weight)
			items = append(items, hrmmodel.HrmPerfItem{
				PerfID:     p.ID,
				ItemName:   it.ItemName,
				Weight:     w,
				TargetDesc: it.TargetDesc,
			})
		}
		return s.itemRepo.BatchCreate(ctx, items)
	})
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PerformanceService) List(ctx context.Context, page, pageSize int, keyword, period string, status int8, employeeID, deptID uint) ([]hrmmodel.HrmPerformance, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, keyword, period, status, employeeID, deptID)
}

func (s *PerformanceService) GetByID(ctx context.Context, id uint) (*hrmmodel.HrmPerformance, []hrmmodel.HrmPerfItem, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, errors.New("考核不存在")
	}
	items, err := s.itemRepo.ListByPerf(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	return p, items, nil
}

// SelfReviewRequest 自评提交。
type SelfReviewRequest struct {
	SelfScore decimal.Decimal `json:"self_score"`
	SelfComment string        `json:"self_comment"`
}

func (s *PerformanceService) SelfReview(ctx context.Context, id uint, req *SelfReviewRequest) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("考核不存在")
	}
	if p.Status != hrmmodel.PerfStatusActive {
		return errors.New("仅进行中的考核可自评")
	}
	p.SelfScore = req.SelfScore
	p.SelfComment = req.SelfComment
	p.SelfTime = xtime.NewNullDateTimeFromTime(time.Now())
	p.Status = hrmmodel.PerfStatusSelfDone
	return s.repo.Update(ctx, p)
}

// ReviewRequest 上级评审。
type ReviewRequest struct {
	ReviewScore   decimal.Decimal `json:"review_score"`
	ReviewComment string          `json:"review_comment"`
	FinalScore    decimal.Decimal `json:"final_score"`
	Grade         string          `json:"grade"`
}

func (s *PerformanceService) Review(ctx context.Context, id uint, req *ReviewRequest) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("考核不存在")
	}
	if p.Status != hrmmodel.PerfStatusSelfDone && p.Status != hrmmodel.PerfStatusReview {
		return errors.New("仅自评完成或评审中的考核可评审")
	}
	p.ReviewScore = req.ReviewScore
	p.ReviewComment = req.ReviewComment
	p.FinalScore = req.FinalScore
	p.Grade = req.Grade
	p.ReviewTime = xtime.NewNullDateTimeFromTime(time.Now())
	p.Status = hrmmodel.PerfStatusDone
	return s.repo.Update(ctx, p)
}

func (s *PerformanceService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return errors.New("考核不存在")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.itemRepo.DeleteByPerf(ctx, id); err != nil {
			return err
		}
		return s.repo.Delete(ctx, id)
	})
}

func parsePerfDate(s string) (xtime.DateTime, error) {
	t, err := time.ParseInLocation("2006-01-02", s, time.Local)
	if err != nil {
		return xtime.DateTime{}, err
	}
	return xtime.NewDateTime(t), nil
}
