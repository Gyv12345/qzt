package service

import (
	"context"
	"time"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/ipregion"
	"qzt-go-server/internal/repository"
)

type OperationLogService struct {
	repo *repository.OperationLogRepo
}

func NewOperationLogService() *OperationLogService {
	return &OperationLogService{repo: repository.NewOperationLogRepo()}
}

type ListOperationLogRequest struct {
	Username  string
	Module    string
	ClientIP  string
	Success   *bool
	Keyword   string
	StartTime string
	EndTime   string
}

// List builds a QueryOptions from the request and delegates to BaseRepo.PageList.
// Equality filters go in Where; the time range and the keyword OR (which Where /
// Search can't express) go in Conds.
func (s *OperationLogService) List(ctx context.Context, page, pageSize int, req *ListOperationLogRequest) ([]model.SysOperationLog, int64, error) {
	q := &repository.QueryOptions{
		Where: map[string]any{},
		Order: []string{"id DESC"},
	}
	if req.Username != "" {
		q.Where["username"] = req.Username
	}
	if req.Module != "" {
		q.Where["module"] = req.Module
	}
	if req.ClientIP != "" {
		q.Where["client_ip"] = req.ClientIP
	}
	if req.Success != nil {
		q.Where["success"] = *req.Success
	}
	if start := parseTimeRange(req.StartTime); !start.IsZero() {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at >= ?", Args: []any{start}})
	}
	if end := parseTimeRange(req.EndTime); !end.IsZero() {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at <= ?", Args: []any{end}})
	}
	if req.Keyword != "" {
		kw := "%" + req.Keyword + "%"
		q.Conds = append(q.Conds, repository.Cond{Query: "action LIKE ? OR path LIKE ?", Args: []any{kw, kw}})
	}
	list, total, err := s.repo.PageList(ctx, page, pageSize, q)
	if err != nil {
		return nil, 0, err
	}
	// 查询时实时解析 IP 归属地(历史数据也能显示;ipregion 未加载则 Region 为空)
	for i := range list {
		list[i].Region = ipregion.Lookup(list[i].ClientIP)
	}
	return list, total, nil
}

func (s *OperationLogService) GetByID(ctx context.Context, id uint) (*model.SysOperationLog, error) {
	log, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	log.Region = ipregion.Lookup(log.ClientIP)
	return log, nil
}

func (s *OperationLogService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

func (s *OperationLogService) Clear(ctx context.Context) error {
	return s.repo.Clear(ctx)
}

// parseTimeRange accepts "2006-01-02 15:04:05" or "2006-01-02" in local time and
// returns the zero time on empty/invalid input (the filter then skips it).
func parseTimeRange(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02"} {
		if t, err := time.ParseInLocation(layout, s, time.Local); err == nil {
			return t
		}
	}
	return time.Time{}
}
