package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xtime"
)

// work_log.go 工作日志服务。

type WorkLogService struct {
	repo *oarepo.WorkLogRepo
}

func NewWorkLogService() *WorkLogService { return &WorkLogService{repo: oarepo.NewWorkLogRepo()} }

type CreateWorkLogRequest struct {
	LogType  string `json:"log_type"`
	LogDate  string `json:"log_date" binding:"required"`
	Content  string `json:"content"`
	Plan     string `json:"plan"`
	Problems string `json:"problems"`
	DeptID   *uint  `json:"dept_id"`
}

func (s *WorkLogService) Create(ctx context.Context, req *CreateWorkLogRequest, userID uint) (*oamodel.OaWorkLog, error) {
	logNo, _ := numbergen.Generate(ctx, "worklog")

	logDate, err := parseDateField(req.LogDate)
	if err != nil {
		return nil, errors.New("日志日期格式错误")
	}

	if req.LogType == "" {
		req.LogType = "DAILY"
	}

	log := &oamodel.OaWorkLog{
		LogNo:     logNo,
		LogType:   req.LogType,
		LogDate:   logDate,
		Content:   req.Content,
		Plan:      req.Plan,
		Problems:  req.Problems,
		CreatorID: userID,
		DeptID:    req.DeptID,
	}
	if err := s.repo.Create(ctx, log); err != nil {
		return nil, err
	}
	return log, nil
}

func (s *WorkLogService) List(ctx context.Context, page, pageSize int, logType, startDate, endDate string) ([]oamodel.OaWorkLog, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, logType, startDate, endDate)
}

func (s *WorkLogService) GetByID(ctx context.Context, id uint) (*oamodel.OaWorkLog, error) {
	log, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "日志不存在")
	}
	return log, nil
}

type UpdateWorkLogRequest struct {
	LogType  string `json:"log_type"`
	LogDate  string `json:"log_date"`
	Content  string `json:"content"`
	Plan     string `json:"plan"`
	Problems string `json:"problems"`
	DeptID   *uint  `json:"dept_id"`
}

func (s *WorkLogService) Update(ctx context.Context, id uint, req *UpdateWorkLogRequest) error {
	log, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "日志不存在")
	}
	log.LogType = req.LogType
	log.Content = req.Content
	log.Plan = req.Plan
	log.Problems = req.Problems
	log.DeptID = req.DeptID
	if req.LogDate != "" {
		if t, err := parseDateField(req.LogDate); err == nil {
			log.LogDate = t
		}
	}
	return s.repo.Update(ctx, log)
}

func (s *WorkLogService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "日志不存在")
	}
	return s.repo.Delete(ctx, id)
}

var _ xtime.DateTime // 确保 xtime import 被使用
