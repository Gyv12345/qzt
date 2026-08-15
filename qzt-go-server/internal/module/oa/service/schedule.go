package service

import (
	"context"
	"errors"
	"time"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xtime"
)

// schedule.go 日程安排服务。

type ScheduleService struct {
	repo *oarepo.ScheduleRepo
}

func NewScheduleService() *ScheduleService { return &ScheduleService{repo: oarepo.NewScheduleRepo()} }

type CreateScheduleRequest struct {
	Title      string `json:"title" binding:"required"`
	EventType  string `json:"event_type"`
	StartTime  string `json:"start_time" binding:"required"`
	EndTime    string `json:"end_time" binding:"required"`
	Location   string `json:"location"`
	Content    string `json:"content"`
	RemindType string `json:"remind_type"`
	Status     string `json:"status"`
}

func (s *ScheduleService) Create(ctx context.Context, req *CreateScheduleRequest, userID uint) (*oamodel.OaSchedule, error) {
	scheduleNo, _ := numbergen.Generate(ctx, "schedule")

	startTime, err := parseDateTimeField(req.StartTime)
	if err != nil {
		return nil, errors.New("开始时间格式错误")
	}
	endTime, err := parseDateTimeField(req.EndTime)
	if err != nil {
		return nil, errors.New("结束时间格式错误")
	}

	if req.EventType == "" {
		req.EventType = "OTHER"
	}
	if req.RemindType == "" {
		req.RemindType = "NONE"
	}
	if req.Status == "" {
		req.Status = "PENDING"
	}

	sch := &oamodel.OaSchedule{
		ScheduleNo: scheduleNo,
		Title:      req.Title,
		EventType:  req.EventType,
		StartTime:  startTime,
		EndTime:    endTime,
		Location:   req.Location,
		Content:    req.Content,
		RemindType: req.RemindType,
		Status:     req.Status,
		CreatorID:  userID,
	}
	if err := s.repo.Create(ctx, sch); err != nil {
		return nil, err
	}
	return sch, nil
}

func (s *ScheduleService) List(ctx context.Context, page, pageSize int, creatorID uint, eventType, status, startDate, endDate string) ([]oamodel.OaSchedule, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, creatorID, eventType, status, startDate, endDate)
}

// ListByDateRange 日历视图:返回当前用户指定日期范围内的全部日程。
func (s *ScheduleService) ListByDateRange(ctx context.Context, creatorID uint, startDate, endDate string) ([]oamodel.OaSchedule, error) {
	return s.repo.ListByDateRange(ctx, creatorID, startDate, endDate)
}

func (s *ScheduleService) GetByID(ctx context.Context, id uint) (*oamodel.OaSchedule, error) {
	sch, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "日程不存在")
	}
	return sch, nil
}

type UpdateScheduleRequest struct {
	Title      string `json:"title"`
	EventType  string `json:"event_type"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	Location   string `json:"location"`
	Content    string `json:"content"`
	RemindType string `json:"remind_type"`
	Status     string `json:"status"`
}

func (s *ScheduleService) Update(ctx context.Context, id uint, req *UpdateScheduleRequest) error {
	sch, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "日程不存在")
	}
	sch.Title = req.Title
	sch.EventType = req.EventType
	sch.Location = req.Location
	sch.Content = req.Content
	sch.RemindType = req.RemindType
	sch.Status = req.Status
	if req.StartTime != "" {
		if t, err := parseDateTimeField(req.StartTime); err == nil {
			sch.StartTime = t
		}
	}
	if req.EndTime != "" {
		if t, err := parseDateTimeField(req.EndTime); err == nil {
			sch.EndTime = t
		}
	}
	return s.repo.Update(ctx, sch)
}

func (s *ScheduleService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "日程不存在")
	}
	return s.repo.Delete(ctx, id)
}

// parseDateTimeField 解析 yyyy-MM-dd HH:mm:ss 为 xtime.DateTime。
func parseDateTimeField(s string) (xtime.DateTime, error) {
	t, err := time.ParseInLocation("2006-01-02 15:04:05", s, time.Local)
	if err != nil {
		return xtime.DateTime{}, err
	}
	return xtime.NewDateTime(t), nil
}
